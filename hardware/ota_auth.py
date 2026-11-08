# Appends the OTA password from include/secrets.h (git-ignored) to the espota
# upload command, so `pio run -e cyd_ota -t upload` authenticates without any
# manual flags. Putting `upload_flags = --auth=...` in platformio.ini would
# commit the password to git instead.
Import("env")

import os
import re

secrets = os.path.join(env.subst("$PROJECT_DIR"), "include", "secrets.h")
try:
    with open(secrets) as f:
        match = re.search(r'#define\s+OTA_PASSWORD\s+"([^"]*)"', f.read())
    if match and match.group(1):
        env.Append(UPLOADERFLAGS=["--auth=" + match.group(1)])
except OSError:
    pass  # no secrets.h -> device runs OTA without a password
