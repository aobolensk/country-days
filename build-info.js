const commit = "development";
const buildCommit = document.getElementById("buildCommit");

if (buildCommit) {
  const isCommitHash = /^[0-9a-f]{40}$/.test(commit);
  buildCommit.textContent = isCommitHash ? commit.slice(0, 7) : commit;

  if (isCommitHash) {
    buildCommit.href = `https://github.com/aobolensk/country-days/commit/${commit}`;
    buildCommit.title = `Deployed commit ${commit}`;
  }
}
