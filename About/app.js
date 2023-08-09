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
      document.getElementById('Logs-md').innerHTML = html;
  });
};