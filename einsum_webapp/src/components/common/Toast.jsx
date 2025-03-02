// toast.js
export const Toast = (function() {
  const style = document.createElement('style');
  style.textContent = `
    .toast-container {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    }
    .toast {
      background-color: #333;
      color: #fff;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 10px;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      min-width: 250px;
      text-align: left;
      white-space: pre;
      font-family: monospace;
      font-size: 14px;
      max-width: 90vw;
      overflow-x: auto;
    }
    .toast.show {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  let container = null;
  let currentToast = null;
  let hideTimeoutId = null;

  function createContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function createToastElement(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    // Use textContent to preserve whitespace
    toast.textContent = message;
    return toast;
  }

  function showToast(message, duration = 8000) { // Increased duration to give more time to read
    const container = createContainer();

    // Remove any existing toast
    if (currentToast) {
      container.removeChild(currentToast);
      clearTimeout(hideTimeoutId);
    }

    // Create and add new toast
    currentToast = createToastElement(message);
    container.appendChild(currentToast);

    // Force reflow to ensure the transition works
    void currentToast.offsetWidth;

    // Show the toast
    currentToast.classList.add('show');

    // Set timeout to hide the toast
    hideTimeoutId = setTimeout(() => {
      if (currentToast) {
        currentToast.classList.remove('show');
      }
      // Remove the toast after the transition
      setTimeout(() => {
        if (currentToast && currentToast.parentNode) {
          container.removeChild(currentToast);
          currentToast = null;
        }
      }, 300);
    }, duration);
  }

  return {
    show: showToast
  };
})();