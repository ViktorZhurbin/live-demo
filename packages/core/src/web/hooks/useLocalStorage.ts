import { useLocalStorage } from "@mantine/hooks";
import { LocalStorage } from "web/constants/localStorage";
import { PanelsView } from "web/constants/settings";

export const useLocalStorageView = () => {
  return useLocalStorage({
    defaultValue: PanelsView.Split,
    key: LocalStorage.PanelsView,
  });
};

export const useLocalStorageWrapCode = () => {
  return useLocalStorage({
    defaultValue: false,
    key: LocalStorage.WrapCode,
  });
};
