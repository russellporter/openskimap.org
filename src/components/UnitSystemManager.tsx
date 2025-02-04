import * as React from "react";
import { SettingsEvent } from "./SettingsEvent";
import { UnitSystem, unitSystemFromString } from "./utils/UnitHelpers";

const UNIT_SYSTEM_SETTING_LOCAL_STORAGE_KEY = "setting.unitSystem";

export const UnitSystemManager: React.FunctionComponent<{
  render: (unitSystem: UnitSystem) => React.ReactNode;
}> = (props) => {
  const [unitSystem, setUnitSystem] = React.useState<UnitSystem>(
    getUnitSystem_NonReactive()
  );

  React.useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      if (
        (event as SettingsEvent).detail.settingsProperty ===
        SettingsEvent.UNIT_SYSTEM_SETTINGS_PROPERTY
      ) {
        setUnitSystem(getUnitSystem_NonReactive());
      }
    };

    window.addEventListener(SettingsEvent.EVENT_TYPE, handleSettingsChange);

    return () => {
      window.removeEventListener(
        SettingsEvent.EVENT_TYPE,
        handleSettingsChange
      );
    };
  }, []);

  return props.render(unitSystem);
};

export function setUnitSystem(unitSystem: UnitSystem) {
  const event = new SettingsEvent({
    settingsProperty: SettingsEvent.UNIT_SYSTEM_SETTINGS_PROPERTY,
  });

  localStorage.setItem(UNIT_SYSTEM_SETTING_LOCAL_STORAGE_KEY, unitSystem);

  window.dispatchEvent(event);
}

export function getUnitSystem_NonReactive(): UnitSystem {
  return unitSystemFromString(
    localStorage.getItem(UNIT_SYSTEM_SETTING_LOCAL_STORAGE_KEY)
  );
}

export function addUnitSystemChangeListener_NonReactive({
  onUnitSystemChange,
  triggerWhenInitialized,
}: {
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
  triggerWhenInitialized: boolean;
}) {
  const handleSettingsChange = (event: Event) => {
    if (
      (event as SettingsEvent).detail.settingsProperty ===
      SettingsEvent.UNIT_SYSTEM_SETTINGS_PROPERTY
    ) {
      onUnitSystemChange(getUnitSystem_NonReactive());
    }
  };

  window.addEventListener(SettingsEvent.EVENT_TYPE, handleSettingsChange);
  if (triggerWhenInitialized) {
    onUnitSystemChange(getUnitSystem_NonReactive());
  }
}
