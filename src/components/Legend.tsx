import { Card, CardContent, Typography } from "@material-ui/core";
import * as React from "react";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";

export const Legend: React.FunctionComponent<{
  width: number;
  eventBus: EventBus;
}> = (props) => {
  const sliderMargins = { marginLeft: "8px", marginRight: "8px" };
  const formSectionStyle = { marginBottom: "16px" };

  return (
    <Card style={{ width: props.width }}>
      <CardContent>
        <InfoHeader onClose={() => props.eventBus.closeLegend()}>
          <Typography gutterBottom variant="h6">
            Legend
          </Typography>
        </InfoHeader>
        <div style={formSectionStyle}></div>
      </CardContent>
    </Card>
  );
};
