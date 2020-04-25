import { MuiThemeProvider } from "@material-ui/core";
import * as React from "react";
import { theme } from "./Theme";

export const Themed: React.FunctionComponent = (props) => (
  <MuiThemeProvider theme={theme}>{props.children}</MuiThemeProvider>
);
