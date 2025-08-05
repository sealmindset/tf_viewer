# list the 20 largest objects (sizes are in bytes)
git rev-list --objects --all \
| git cat-file --batch-check='%(objectname) %(objecttype) %(objectsize) %(rest)' \
| sort -k3 -n -r | head -20
