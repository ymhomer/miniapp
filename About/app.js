document.addEventListener('DOMContentLoaded', function() {
  fetch('/miniapp/README.md')
    .then(response => response.text()) 
    .then(text => {
      const html = marked(text); 
      document.getElementById('your-container-id').innerHTML = html;
  });
});