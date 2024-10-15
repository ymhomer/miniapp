document.addEventListener("DOMContentLoaded", function() {
    //const fullscreenBtn = document.getElementById('fullscreenBtn');
    //const newtabBtn = document.getElementById('newtabBtn');
    //const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const myIframe = document.getElementById('app-iframe');
    const fullscreenContainer = document.getElementById('fullscreenContainer');



    var projectPath = window.location.origin + '/' + window.location.pathname.split('/')[1];
    var defaultUrl = projectPath + '/Home/index.html';
    myIframe.setAttribute('src', defaultUrl);
    console.log("Default URL set to:", defaultUrl);

    let currentIframeSrc = defaultUrl;

    // Adjust iframe height function
    function adjustIframeHeight() {
        const iframe = myIframe;
        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    }

    // Adjust iframe size function
    /*function adjustIframeSize() {
        const iframe = myIframe;
        const iframeContent = iframe.contentWindow || iframe.contentDocument;

        const contentHeight = iframeContent.document.body.scrollHeight;
        const contentWidth = iframeContent.document.body.scrollWidth;

        iframe.style.height = contentHeight + 'px';
        iframe.style.width = contentWidth + 'px';
    }*/

    function adjustIframeSize() {
        const iframe = myIframe;
        const iframeContent = iframe.contentWindow || iframe.contentDocument;

        const contentHeight = iframeContent.document.documentElement.scrollHeight;
        const contentWidth = iframeContent.document.documentElement.scrollWidth;

        iframe.style.height = contentHeight + 'px';
        iframe.style.width = contentWidth + 'px';
    }
    //extra event to receveive resize event from iframe
    window.addEventListener('message', function(event) {
        if (event.data.type === 'resize') {
            const iframe = document.getElementById('myIframe');
            iframe.style.height = event.data.height + 'px';
        }
    });

    // Event listeners for fullscreen and new tab buttons
    /*
    fullscreenBtn.addEventListener('click', function() {
        console.log('Fullscreen button clicked');
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
    */
    /*
    exitFullscreenBtn.addEventListener('click', function() {
        console.log('Exit Fullscreen button clicked');
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
    */

    /*
    newtabBtn.addEventListener('click', function() {
        console.log('New Tab button clicked');
        var iframeSrc = document.getElementById('app-iframe').src;
        window.open(currentIframeSrc, '_blank');
    });
    */

    // Handle fullscreen change event
    /*
    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            myIframe.style.height = '100vh';
            myIframe.style.width = '100vw';
            exitFullscreenBtn.style.display = 'block';
        } else {
            adjustIframeHeight();
            exitFullscreenBtn.style.display = 'none';
        }
    });*/

    // Handle iframe load event to adjust its height
    myIframe.onload = function() {
        adjustIframeHeight();
    };

    // Handle window resize event
    window.addEventListener('resize', function() {
        if (!document.fullscreenElement) {
            adjustIframeHeight();
        }
    });

    // Handle clicks on logoUrl elements
    var logoUrlElements = document.querySelectorAll('[logoUrl]');
    for (let i = 0; i < logoUrlElements.length; i++) {
        logoUrlElements[i].addEventListener('click', function(e) {
            e.preventDefault();
            var logoUrl = logoUrlElements[i].getAttribute('logoUrl');
            var targetUrl = projectPath;
            window.location.href = targetUrl;
            console.log("Navigating to:", targetUrl);
        });
    }

    // Handle clicks on dataApp elements
    var dataAppElements = document.querySelectorAll('[data-app]');
    for (let i = 0; i < dataAppElements.length; i++) {
        dataAppElements[i].addEventListener('click', function(e) {
            e.preventDefault();
            var app = dataAppElements[i].getAttribute('data-app');
            var targetUrl = projectPath + app + '/index.html';
            myIframe.setAttribute('src', targetUrl);
            currentIframeSrc = targetUrl;
            console.log("Setting iframe source to:", targetUrl);
        });
    }

    // Close navbar when link is clicked
    document.querySelectorAll('.close-navbar').forEach(function(element) {
        element.addEventListener('click', function() {
            var navbarToggler = document.querySelector('.navbar-toggler');
            if (!navbarToggler.classList.contains('collapsed')) {
                navbarToggler.click();
            }
        });
    });
});
