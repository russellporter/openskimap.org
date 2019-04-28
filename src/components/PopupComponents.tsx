import * as React from "react";
import { SkiWayData } from "./MapData";

interface WithTitleProps {
  title: string | undefined;
  badge: BadgeProps | null | undefined;
}

interface TitleProps {
  title: string;
}

interface ContainerProps {}

interface HeaderProps {}

export const WithTitle: React.SFC<WithTitleProps> = props => {
  let title = props.title ? <Title title={props.title} /> : null;
  let badge = props.badge ? <Badge {...props.badge} /> : null;
  return (
    <Container>
      {(title || badge) && (
        <Header>
          {title}
          {title && badge && " "}
          {badge}
        </Header>
      )}
      {props.children}
    </Container>
  );
};

export const Container: React.SFC<ContainerProps> = props => {
  return <div className="ski-popup">{props.children}</div>;
};

export const Header: React.SFC<HeaderProps> = props => {
  return <div className="ski-popup-header">{props.children}</div>;
};

export const Title: React.SFC<TitleProps> = props => {
  return <span className="ski-popup-title">{props.title}</span>;
};

interface BadgeProps {
  color: string;
  content: string;
}

export function refBadgeFromData(data: SkiWayData): BadgeProps | null {
  if (data.ref && data.ref.length > 0) {
    return { color: data.color, content: data.ref };
  } else {
    return null;
  }
}

export const Badge: React.SFC<BadgeProps> = props => {
  return (
    <span className="badge badge-pill" style={{ backgroundColor: props.color }}>
      {props.content}
    </span>
  );
};
