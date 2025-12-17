import { IconTextWrap, IconTextWrapDisabled } from "@tabler/icons-react";
import { useLocalStorageWrapCode } from "web/hooks/useLocalStorage";
import { Button } from "../../components";

export const ButtonWrapCode = () => {
  const [wrapped, setWrapped] = useLocalStorageWrapCode();

  const toggleWrapped = () => {
    setWrapped(!wrapped);
  };

  const Icon = wrapped ? IconTextWrap : IconTextWrapDisabled;

  return (
    <Button icon={<Icon />} title="Toggle code wrap" onClick={toggleWrapped} />
  );
};
