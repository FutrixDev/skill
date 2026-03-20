# WeChat Formatting Notes

This reference captures the constraints that matter for this host's WeChat publishing workflow.

## Markdown vs WeChat Draft Content

- Markdown is authoring syntax; WeChat draft APIs expect HTML content fragments.
- WeChat content should be treated as a conservative HTML subset, not arbitrary browser HTML.
- Complex browser layout features are poor fits for WeChat content:
  - no script-driven behavior
  - no external stylesheet dependency
  - no layout logic that depends on classes, ids, CSS variables, flex, grid, or JavaScript
- A browser preview is useful for debugging, but the real acceptance test is whether the WeChat draft API accepts the content and the draft renders correctly in WeChat.

## Safe Output Strategy

- Output only HTML fragments for the article body.
- Use inline styles only.
- Prefer these tags:
  - `h1` `h2` `h3`
  - `p`
  - `blockquote`
  - `pre` `code`
  - `img`
  - `hr`
  - `strong` `em` `a` `br`
- Avoid semantic list tags in final WeChat output.
  - Even when `ul` / `ol` / `li` look correct in intermediate HTML, the WeChat editor may reflow them into phantom blank bullets or skipped numbers.
  - Flatten lists into plain paragraphs with visible prefixes such as `• ` or `1. `.
- Avoid or flatten:
  - `table`
  - `style`
  - `script`
  - `iframe`
  - `svg`
  - arbitrary raw HTML pasted from Markdown

## Formatting Implications

- Tables in Markdown should be flattened into bullet sections for WeChat.
- Ordered and unordered lists should also be flattened before draft creation; local HTML preview is not enough evidence that WeChat will preserve list semantics.
- Code blocks should use simplified inline styles with `<pre><code>`.
- External links inside the article body are not reliable delivery primitives.
  - In practice, WeChat may strip or neutralize `<a href>` in draft content.
  - Use `content_source_url` as the stable click-through path and point it at the canonical blog page.
- Links should stay plain and readable; no interactive assumptions inside the body.
- Headings need explicit inline spacing and border/color styling because there is no shared stylesheet.

## Images

Cover and body images are not the same thing in WeChat:

- Cover image:
  - upload through `material/add_material?type=image`
  - use the returned `media_id` as `thumb_media_id`
- Body illustrations:
  - upload through `media/uploadimg`
  - replace the HTML `<img src>` with the returned URL

For body images, normalize the source before upload:

- accept local paths or remote URLs
- convert to `jpg` or `png`
- keep under the WeChat body-image size limit

## Repository Rule

In this repository, the default Jimeng 4.0 cover generator lives here:

- `modules/image-generation/jimeng-volcengine/scripts/jimeng_image.py`

The dedicated publish path for WeChat Markdown is:

- `modules/content-publishing/wechat-mp-publisher/scripts/wechat_mp_publish.py`
