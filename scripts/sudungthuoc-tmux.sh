#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="sudungthuoc"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is not installed." >&2
    exit 1
fi

if [[ -n "${TMUX:-}" ]]; then
    if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
        exec tmux switch-client -t "${SESSION_NAME}"
    fi

    exec tmux new-session -d -s "${SESSION_NAME}" -c "${PROJECT_DIR}" \; switch-client -t "${SESSION_NAME}"
fi

exec tmux new-session -A -s "${SESSION_NAME}" -c "${PROJECT_DIR}"
