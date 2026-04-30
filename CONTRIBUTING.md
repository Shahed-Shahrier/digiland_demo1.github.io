How to update this repository from this local clone

Quick steps

- Ensure your git identity is set locally or globally:

  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"

- Make changes in this folder, then run the helper script:

  ./scripts/update_and_push.sh "Your commit message"

  The script stages all changes, creates a commit (message from the argument or prompt),
  and pushes to the remote branch (sets upstream on first push).

If you prefer SSH instead of HTTPS (recommended to avoid typing credentials),
follow GitHub docs to add an SSH key and then change the remote URL:

  git remote set-url origin git@github.com:Shahed-Shahrier/digiland_demo1.github.io.git

Notes

- The script commits everything (equivalent to `git add -A`). If you need finer control,
  use `git add` and `git commit` manually.
- The script will not push if there are no staged changes.
