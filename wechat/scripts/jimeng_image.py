#!/usr/bin/env python3
"""
火山引擎即梦4.0图片生成脚本
用于为博客和公众号文章生成配图

用法:
    python3 jimeng_image.py --prompt "描述词"
    python3 jimeng_image.py --type tech --output cover.png
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from time import sleep
from typing import Optional
import sys
import urllib.parse
import urllib.request

CONFIG_PATH = Path(os.environ.get("WECHAT_MP_CONFIG", str(Path(__file__).resolve().parents[1] / "config.json")))
API_HOST = "visual.volcengineapi.com"
API_PATH = "/"
API_VERSION = "2022-08-31"
REQ_KEY = "jimeng_t2i_v40"
DEFAULT_REGION = "cn-north-1"
DEFAULT_SERVICE = "cv"
DEFAULT_SIZE = 2048
MAX_POLL_ATTEMPTS = 20
POLL_INTERVAL_SECONDS = 3


def load_config() -> dict:
    """加载配置"""
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"配置文件不存在: {CONFIG_PATH}")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_credentials(config: dict) -> tuple[str | None, str | None, str, str]:
    """解析 AK/SK 和签名范围。"""
    volc = config.get("volc_engine", {})
    access_key = (
        volc.get("access_key_id")
        or os.environ.get("VOLC_ACCESSKEY")
        or os.environ.get("VOLC_ACCESS_KEY_ID")
    )
    secret_key = (
        volc.get("secret_access_key")
        or os.environ.get("VOLC_SECRETKEY")
        or os.environ.get("VOLC_SECRET_ACCESS_KEY")
    )
    region = str(volc.get("region") or DEFAULT_REGION)
    service = str(volc.get("service") or DEFAULT_SERVICE)
    return access_key, secret_key, region, service


def urlencode_rfc3986(value: str) -> str:
    return urllib.parse.quote(value, safe="-_.~")


def canonical_query_string(params: dict[str, str]) -> str:
    pairs = []
    for key, value in sorted(params.items()):
        pairs.append(f"{urlencode_rfc3986(str(key))}={urlencode_rfc3986(str(value))}")
    return "&".join(pairs)


def sign_request(
    method: str,
    host: str,
    path: str,
    params: dict[str, str],
    payload: str,
    access_key: str,
    secret_key: str,
    datetime_str: str,
    region: str,
    service: str,
) -> dict[str, str]:
    """按火山引擎文档生成 HMAC-SHA256 鉴权头。"""
    content_sha256 = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    canonical_headers = (
        "content-type:application/json\n"
        f"host:{host}\n"
        f"x-date:{datetime_str}\n"
    )
    signed_headers = "content-type;host;x-date"
    canonical_request = (
        f"{method}\n"
        f"{path}\n"
        f"{canonical_query_string(params)}\n"
        f"{canonical_headers}\n"
        f"{signed_headers}\n"
        f"{content_sha256}"
    )

    short_date = datetime_str[:8]
    credential_scope = f"{short_date}/{region}/{service}/request"
    string_to_sign = (
        f"HMAC-SHA256\n"
        f"{datetime_str}\n"
        f"{credential_scope}\n"
        f"{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
    )

    k_date = hmac.new(secret_key.encode("utf-8"), short_date.encode("utf-8"), hashlib.sha256).digest()
    k_region = hmac.new(k_date, region.encode("utf-8"), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service.encode("utf-8"), hashlib.sha256).digest()
    k_signing = hmac.new(k_service, b"request", hashlib.sha256).digest()
    signature = hmac.new(k_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    authorization = (
        "HMAC-SHA256 "
        f"Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )
    return {
        "Content-Type": "application/json",
        "X-Date": datetime_str,
        "Authorization": authorization,
    }


def normalize_size_area(size: int | str) -> int:
    """兼容旧 CLI 的边长输入，转换为接口要求的面积值。"""
    if isinstance(size, str):
        raw = size.strip().lower()
        if "x" in raw:
            width_raw, height_raw = raw.split("x", 1)
            return int(width_raw) * int(height_raw)
        size = int(raw)
    if size <= 4096:
        return size * size
    return size


def build_request(
    action: str,
    body: dict[str, object],
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
) -> urllib.request.Request:
    payload = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    params = {"Action": action, "Version": API_VERSION}
    datetime_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    headers = sign_request(
        method="POST",
        host=API_HOST,
        path=API_PATH,
        params=params,
        payload=payload,
        access_key=access_key,
        secret_key=secret_key,
        datetime_str=datetime_str,
        region=region,
        service=service,
    )
    url = f"https://{API_HOST}{API_PATH}?{canonical_query_string(params)}"
    return urllib.request.Request(
        url,
        data=payload.encode("utf-8"),
        headers=headers,
        method="POST",
    )


def post_json(
    action: str,
    body: dict[str, object],
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
) -> dict:
    req = build_request(action, body, access_key, secret_key, region, service)
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def submit_task(
    prompt: str,
    size: int | str,
    width: int | None,
    height: int | None,
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
) -> str | None:
    request_body = {
        "req_key": REQ_KEY,
        "prompt": prompt,
        "force_single": True,
    }
    if width is not None and height is not None:
        request_body["width"] = int(width)
        request_body["height"] = int(height)
    else:
        request_body["size"] = normalize_size_area(size)
    result = post_json(
        "CVSync2AsyncSubmitTask",
        request_body,
        access_key,
        secret_key,
        region,
        service,
    )
    if result.get("code") != 10000:
        print(f"API错误: {result.get('message', result)}")
        return None
    data = result.get("data") or {}
    task_id = data.get("task_id")
    if not task_id:
        print(f"提交任务返回缺少 task_id: {result}")
        return None
    return str(task_id)


def poll_task_result(
    task_id: str,
    access_key: str,
    secret_key: str,
    region: str,
    service: str,
) -> Optional[dict]:
    request_body = {
        "req_key": REQ_KEY,
        "task_id": task_id,
        "req_json": json.dumps({"return_url": True}, ensure_ascii=False, separators=(",", ":")),
    }
    for attempt in range(MAX_POLL_ATTEMPTS):
        result = post_json(
            "CVSync2AsyncGetResult",
            request_body,
            access_key,
            secret_key,
            region,
            service,
        )
        if result.get("code") != 10000:
            print(f"查询任务失败: {result.get('message', result)}")
            return None
        data = result.get("data") or {}
        status = str(data.get("status") or "").lower()
        if status == "done":
            image_urls = data.get("image_urls") or []
            if image_urls:
                return {"url": image_urls[0], "task_id": task_id}
            print(f"任务完成但未返回图片: {result}")
            return None
        if status in {"expired", "not_found"}:
            print(f"任务状态异常: {status}")
            return None
        if attempt < MAX_POLL_ATTEMPTS - 1:
            sleep(POLL_INTERVAL_SECONDS)
    print(f"查询超时: task_id={task_id}")
    return None


def resolve_download_path(
    image_url: str,
    task_id: str,
    output_path: Path | None,
    download_dir: Path | None,
) -> Path:
    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        return output_path
    target_dir = download_dir or (CONFIG_PATH.parent / "generated-images")
    target_dir.mkdir(parents=True, exist_ok=True)
    parsed_path = Path(urllib.parse.urlparse(image_url).path)
    suffix = parsed_path.suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        suffix = ".png"
    return target_dir / f"{task_id}{suffix}"


def generate_image(
    prompt: str,
    size: int | str = DEFAULT_SIZE,
    *,
    width: int | None = None,
    height: int | None = None,
    auto_download: bool = False,
    output_path: Path | None = None,
    download_dir: Path | None = None,
) -> Optional[dict]:
    """调用即梦4.0生成图片"""
    config = load_config()
    access_key, secret_key, region, service = resolve_credentials(config)

    if not access_key or not secret_key:
        print("错误: 缺少火山引擎 AK/SK 凭证")
        return None
    if (width is None) != (height is None):
        print("错误: width 和 height 必须同时提供")
        return None

    try:
        task_id = submit_task(
            prompt,
            size,
            width,
            height,
            access_key,
            secret_key,
            region,
            service,
        )
        if not task_id:
            return None
        result = poll_task_result(task_id, access_key, secret_key, region, service)
        if not result:
            return None
        if auto_download or output_path is not None or download_dir is not None:
            local_path = resolve_download_path(
                result["url"],
                task_id,
                output_path,
                download_dir,
            )
            if not download_image(result["url"], local_path):
                return None
            result["local_path"] = str(local_path)
        return result
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        print(f"HTTP错误 {exc.code}: {error_body[:300]}")
        return None
    except Exception as exc:
        print(f"请求失败: {exc}")
        return None


# 根据文章类型生成封面提示词
COVER_PROMPTS = {
    "tech": (
        "Professional technology blog cover image, modern digital theme, "
        "abstract circuit board and data stream design, "
        "blue and cyan gradient background, "
        "clean minimalist style, 4K quality"
    ),
    "ai": (
        "Artificial intelligence cover art, futuristic technology, "
        "neural network and brain visualization, "
        "glowing circuit patterns, "
        "purple and blue color scheme, digital art style"
    ),
    "news": (
        "News media cover illustration, professional journalism theme, "
        "global news network visualization, "
        "modern newspaper and digital devices, "
        "clean corporate design, blue theme"
    ),
    "startup": (
        "Startup business cover, entrepreneurial theme, "
        "rocket launch and city skyline, "
        "growth and innovation concept, "
        "orange and purple sunset gradient"
    )
}


def get_cover_prompt(article_type: str = "tech") -> str:
    """获取封面图提示词"""
    return COVER_PROMPTS.get(article_type, COVER_PROMPTS["tech"])


def download_image(url: str, output_path: Path) -> bool:
    """下载图片到本地"""
    try:
        urllib.request.urlretrieve(url, output_path)
        return True
    except Exception as exc:
        print(f"下载失败: {exc}")
        return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description="火山引擎即梦4.0图片生成")
    parser.add_argument("--prompt", "-p", help="图片描述提示词")
    parser.add_argument(
        "--type",
        "-t",
        default="tech",
        choices=["tech", "ai", "news", "startup"],
        help="图片类型",
    )
    parser.add_argument("--output", "-o", help="保存图片路径")
    parser.add_argument(
        "--size",
        "-s",
        type=int,
        default=DEFAULT_SIZE,
        help="图片边长（例如 2048）；脚本会自动换算为接口所需面积值",
    )
    parser.add_argument("--width", type=int, help="图片宽度，需与 --height 一起使用")
    parser.add_argument("--height", type=int, help="图片高度，需与 --width 一起使用")
    parser.add_argument(
        "--download-dir",
        type=Path,
        help="自动下载目录；不传则默认保存到脚本目录下 generated-images/",
    )

    args = parser.parse_args()

    prompt = args.prompt or get_cover_prompt(args.type)

    print("=" * 50)
    print("🔥 火山引擎即梦4.0 图片生成")
    print("=" * 50)
    print(f"Prompt: {prompt[:80]}...")

    result = generate_image(
        prompt,
        args.size,
        width=args.width,
        height=args.height,
        auto_download=bool(args.output or args.download_dir),
        output_path=Path(args.output) if args.output else None,
        download_dir=args.download_dir,
    )

    if result:
        print("\n✅ 图片生成成功!")
        print(f"Task ID: {result['task_id']}")
        print(f"URL: {result['url']}")

        if result.get("local_path"):
            print(f"✅ 已保存到: {result['local_path']}")
    else:
        print("\n❌ 图片生成失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
