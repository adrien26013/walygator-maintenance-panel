import layout from "./layout.config.json";
import { useUI } from "../context/UIContext";

export function useUILayout() {
  const { isMobile } = useUI();
  return isMobile ? layout.mobile : layout.desktop;
}
