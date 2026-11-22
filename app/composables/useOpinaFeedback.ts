type OpinaApi = {
  show: (surveyId?: string) => void;
  prompt?: (surveyId?: string) => void;
  hide?: () => void;
};

/** Force-open Opina CSAT (footer / explicit user action). */
export function useOpinaFeedback() {
  function openOpinaFeedback() {
    if (!import.meta.client) return;
    const w = window as Window & { Opina?: OpinaApi };
    if (w.Opina?.show) {
      w.Opina.show();
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (w.Opina?.show) {
        window.clearInterval(timer);
        w.Opina.show();
      } else if (tries >= 20) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  return { openOpinaFeedback };
}
