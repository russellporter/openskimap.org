type SettingsEventInit = {
  settingsProperty: string;
};

export class SettingsEvent extends CustomEvent<SettingsEventInit> {
  public static EVENT_TYPE = "settings_update";

  public static UNIT_SYSTEM_SETTINGS_PROPERTY = "unitSystem";

  constructor(eventInitDict: SettingsEventInit) {
    super(SettingsEvent.EVENT_TYPE, { detail: eventInitDict });
  }
}
