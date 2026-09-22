/* ============================================================
   REALITY POSTER STUDIO — useToast
   ============================================================ */
function useToast(){
  /* A short note at the foot of the stage — for things worth saying that
     don't deserve a dialog (Delete on an output format hid rather than
     deleted; a dropped file wasn't a picture). */
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);
  const say = React.useCallback((msg, ms)=>{
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(()=>setToast(null), ms||3200);
  }, []);

  return { toast, setToast, say };
}

export { useToast };
