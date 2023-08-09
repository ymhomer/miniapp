document.addEventListener('DOMContentLoaded', function() {
  /*fetch('/miniapp/README.md')
    .then(response => {
      console.log("123");
        console.log(response.url); // 输出你的 fetch 请求的 URL
        return response.text();
    })
    .then(text => {
      const html = marked(text); 
      document.getElementById('Logs-md').innerHTML = html;
  });*/
});

window.onload = function() {
  var mdUrl = 'https://raw.githubusercontent.com/ymhomer/miniapp/master/README.md';
  fetch(mdUrl)
    .then(response => {
      //console.log("123");
        console.log(response.url); // 输出你的 fetch 请求的 URL
        return response.text();
    })
    .then(text => {
      const html = marked.parse(text); 
      document.getElementById('README-md').innerHTML = html;
  });

  fetch('https://api.github.com/repos/ymhomer/miniapp/commits')
    .then(response => response.json())
    .then(commits => {
      let logsHtml = '';
      commits.forEach(commit => {
        logsHtml += `<div>
                      <strong>${commit.commit.author.name}</strong>:
                      ${commit.commit.message} 
                      <em>${new Date(commit.commit.author.date).toLocaleDateString()}</em>
                    </div>`;
      });
      document.getElementById('Logs-md').innerHTML = logsHtml;
    });
};