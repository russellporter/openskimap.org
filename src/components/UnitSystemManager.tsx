import * as React from "react";
import { UnitSystem, unitSystemFromString } from "./utils/UnitHelpers";

const UNIT_SYSTEM_SETTING_KEY = "setting.unitSystem";

export const UnitSystemManager: React.FunctionComponent<{
  render: (unitSystem: UnitSystem) => React.ReactNode;
}> = (props) => {
  const [unitSystem, setUnitSystem] = React.useState<UnitSystem>(
    unitSystemFromString(getUnitSystem_NonReactive())
  );

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      console.log(event);

      if (event.key === UNIT_SYSTEM_SETTING_KEY) {
        setUnitSystem(unitSystemFromString(getUnitSystem_NonReactive()));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return props.render(unitSystem);
};

export function setUnitSystem(unitSystem: UnitSystem) {
  const storageEvent = new StorageEvent("storage", {
    oldValue: getUnitSystem_NonReactive(),
    newValue: unitSystem,
    key: UNIT_SYSTEM_SETTING_KEY,
  });

  localStorage.setItem(UNIT_SYSTEM_SETTING_KEY, unitSystem);

  window.dispatchEvent(storageEvent);
}

export function getUnitSystem_NonReactive(): UnitSystem {
  return unitSystemFromString(localStorage.getItem(UNIT_SYSTEM_SETTING_KEY));
}

export function addUnitSystemChangeListener_NonReactive({
  onUnitSystemChange,
  triggerWhenInitialized,
}: {
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
  triggerWhenInitialized: boolean;
}) {
  const handleStorageChange = (event: StorageEvent) => {
    console.log(event);

    if (event.key === UNIT_SYSTEM_SETTING_KEY) {
      onUnitSystemChange(getUnitSystem_NonReactive());
    }
  };

  window.addEventListener("storage", handleStorageChange);
  if (triggerWhenInitialized) {
    onUnitSystemChange(getUnitSystem_NonReactive());
  }
}
