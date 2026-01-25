// A simple event-based utility to trigger toast notifications from any component
// without prop drilling. App.tsx listens for this event.

export const showToast = (message: string) => {
  const event = new CustomEvent('show-toast', { 
    detail: { message },
    bubbles: true,
    cancelable: true
  });
  window.dispatchEvent(event);
};
