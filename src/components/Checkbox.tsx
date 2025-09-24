import { Checkbox, styled } from "@mui/material";
import { CheckboxProps } from "@mui/material/Checkbox";

const downhillSkiAreaColor = "#3085FE";
const nordicSkiAreaColor = "#20B200";

export const NordicCheckbox = styled((props: CheckboxProps) => (
  <Checkbox {...props} />
))({
  color: nordicSkiAreaColor,
  "&.Mui-checked": {
    color: nordicSkiAreaColor,
  },
});

export const DownhillCheckbox = styled((props: CheckboxProps) => (
  <Checkbox {...props} />
))({
  color: downhillSkiAreaColor,
  "&.Mui-checked": {
    color: downhillSkiAreaColor,
  },
});
