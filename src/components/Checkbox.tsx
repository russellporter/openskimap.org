import { Checkbox, withStyles } from "@material-ui/core";
import { CheckboxProps } from "@material-ui/core/Checkbox";
import * as React from "react";

const downhillSkiAreaColor = "#3085FE";
const nordicSkiAreaColor = "#20B200";

export const NordicCheckbox: React.ComponentType<CheckboxProps> = withStyles({
  root: {
    color: nordicSkiAreaColor,
    "&$checked": {
      color: nordicSkiAreaColor
    }
  },
  checked: {}
})(props => <Checkbox color="default" {...props} />);

export const DownhillCheckbox: React.ComponentType<CheckboxProps> = withStyles({
  root: {
    color: downhillSkiAreaColor,
    "&$checked": {
      color: downhillSkiAreaColor
    }
  },
  checked: {}
})(props => <Checkbox color="default" {...props} />);
