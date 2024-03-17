import { styled } from "@mui/material/styles";
import * as React from "react";
import { TopRightCloseButton } from "./CloseButton";
import { InfoBreadcrumbs, InfoBreadcrumbsProps } from "./InfoBreadcrumbs";

const Root = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
});

const Content = styled("span")(({ theme }) => ({
  display: "inline-flex",
  "&:last-child": {
    marginRight: 0,
  },
  "& > *": {
    marginRight: theme.spacing(1),
  },
}));

export const InfoHeader: React.FunctionComponent<
  React.PropsWithChildren<{
    onClose: () => void;
    breadcrumbs?: InfoBreadcrumbsProps;
  }>
> = (props) => {
  return (
    <Root>
      <div>
        {props.breadcrumbs && <InfoBreadcrumbs {...props.breadcrumbs} />}
        <Content>{props.children}</Content>
      </div>
      <TopRightCloseButton onClick={props.onClose} />
    </Root>
  );
};
