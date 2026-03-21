---
name: wechat-publisher
description: Legacy compatibility shim for older workflows that still mention `wechat-publisher`; on this host the real implementation has been merged into `wechat-mp-publisher`.
---

# WeChat Publisher (compatibility shim)

This legacy skill name is kept only so older prompts and local docs do not break.

## Important

- Do not implement or edit publishing/image-generation logic here.
- The real, single implementation now lives in:
  - `/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher`
- Immediately read `/home/openclaw/.openclaw/workspace/skills/wechat-mp-publisher/SKILL.md` and continue there.
- Jimeng image generation, WeChat HTML preview, and final draft publishing are all handled by the merged `wechat-mp-publisher` skill.

## Migration Rule

If a script, memory note, or old message mentions `wechat-publisher`, translate it to `wechat-mp-publisher` before acting.
