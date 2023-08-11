document.addEventListener("DOMContentLoaded", function() {
	//const mainNav = document.getElementById('mainNav');
	//var navLinks = mainNav.querySelectorAll('a.dropdown-item');
	//var dropdownItems = mainNav.querySelectorAll('a.dropdown-item');
	debugger;
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const newtabBtn = document.getElementById('newtabBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const myIframe = document.getElementById('app-iframe');
    const fullscreenContainer = document.getElementById('fullscreenContainer');

    var projectPath = window.location.origin + '/' + window.location.pathname.split('/')[1];
    var defaultUrl = projectPath + '/About/index.html';
    myIframe.setAttribute('src', defaultUrl);
    document.getElementById("debuglog").innerHTML = defaultUrl;

    var logoUrlElements = document.querySelectorAll('[logoUrl]');
    for (let i = 0; i < logoUrlElements.length; i++) {
        logoUrlElements[i].addEventListener('click', function(e) {
            e.preventDefault();
            var logoUrl = logoUrlElements[i].getAttribute('logoUrl');
            var targetUrl = projectPath;
            window.location.href = targetUrl;
            document.getElementById("debuglog").innerHTML = targetUrl;
        });
    }
    
    var dataAppElements = document.querySelectorAll('[data-app]');
    for (let i = 0; i < dataAppElements.length; i++) {
        dataAppElements[i].addEventListener('click', function(e) {
            e.preventDefault();
            var app = dataAppElements[i].getAttribute('data-app');
            var targetUrl = projectPath + app + '/index.html';
            myIframe.setAttribute('src', targetUrl);
            document.getElementById("debuglog").innerHTML = targetUrl;
        });
    }

    document.querySelectorAll('.close-navbar').forEach(function(element) {
	    element.addEventListener('click', function() {
	        var navbarToggler = document.querySelector('.navbar-toggler');
	        if (!navbarToggler.classList.contains('collapsed')) {
	            navbarToggler.click();
	        }
	    });
	});


    function adjustIframeHeight(iframe) {
    	iframe.style.height = (iframe.contentWindow.document.body.scrollHeight - 50) + 'px';
  	}

  	myIframe.onload = function() {
    	adjustIframeHeight(myIframe);
  	}

	document.addEventListener('fullscreenchange', function() {
     	if (document.fullscreenElement) {
        	adjustIframeSize();
    	}
	});

	function adjustIframeSize() {
      const iframe = myIframe;
      const iframeContent = iframe.contentWindow || iframe.contentDocument;

      const contentHeight = iframeContent.document.body.scrollHeight;
      const contentWidth = iframeContent.document.body.scrollWidth;

      iframe.style.height = contentHeight + 'px';
      iframe.style.width = contentWidth + 'px';
 	}

  window.addEventListener('resize', function() {
      if (document.fullscreenElement) {
          myIframe.style.height = '100vh';
          myIframe.style.width = '100vw';
      } else {
          adjustIframeSize(myIframe);
      }
  });

    //const myIframe = document.getElementById('app-iframe');
    /*myIframe.addEventListener('load', () => {
        myIframe.contentWindow.focus();
    });*/

    fullscreenBtn.addEventListener('click', function() {
      if (fullscreenContainer.requestFullscreen) {
          fullscreenContainer.requestFullscreen();
      } else if (fullscreenContainer.mozRequestFullScreen) {
          fullscreenContainer.mozRequestFullScreen();
      } else if (fullscreenContainer.webkitRequestFullscreen) {
          fullscreenContainer.webkitRequestFullscreen();
      } else if (fullscreenContainer.msRequestFullscreen) {
          fullscreenContainer.msRequestFullscreen();
      }
	});

	exitFullscreenBtn.addEventListener('click', function() {
      if (document.exitFullscreen) {
          document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
      }
	});

	newtabBtn.addEventListener('click', function() {
      var iframeSrc = document.getElementById('app-iframe').src;
      window.open(iframeSrc, '_blank');
	});

	document.addEventListener('fullscreenchange', function() {
      if (document.fullscreenElement) {
        myIframe.style.height = '100vh';
          myIframe.style.width = '100vw';
          exitFullscreenBtn.style.display = 'block';
      } else {
        adjustIframeSize(myIframe);
          exitFullscreenBtn.style.display = 'none';
      }
	});
});