document.addEventListener('DOMContentLoaded', function() {
  fetch('/miniapp/README.md')
    .then(response => {
      console.log('123');
        console.log(response.url); // 输出你的 fetch 请求的 URL
        return response.text();
    })
    .then(text => {
      const html = marked(text); 
      document.getElementById('your-container-id').innerHTML = html;
  });
});