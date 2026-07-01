import { useEffect } from "react";

export function useEngineModalLock({
  acceptedQuestNotice,
  cityOpen,
  confirmMapAbandonOpen,
  engineRef,
  heroOpen,
  helpOpen,
  mapOpen,
  questOffer,
  questOverviewOpen,
  regionMapOpen,
  setInventoryOpen,
  setSelectedItem,
}) {
  useEffect(() => {
    const modalOpen = cityOpen
      || mapOpen
      || regionMapOpen
      || heroOpen
      || helpOpen
      || questOverviewOpen
      || confirmMapAbandonOpen
      || Boolean(questOffer)
      || Boolean(acceptedQuestNotice);

    engineRef.current?.setInputLocked(modalOpen);
    engineRef.current?.setPaused(modalOpen);
    if (cityOpen) {
      setInventoryOpen(false);
      setSelectedItem(null);
    }
    return () => {
      engineRef.current?.setInputLocked(false);
      engineRef.current?.setPaused(false);
    };
  }, [
    acceptedQuestNotice,
    cityOpen,
    confirmMapAbandonOpen,
    engineRef,
    heroOpen,
    helpOpen,
    mapOpen,
    questOffer,
    questOverviewOpen,
    regionMapOpen,
    setInventoryOpen,
    setSelectedItem,
  ]);
}
