import { useMediaQuery, useTheme } from "@mui/material";
import * as React from "react";
import { Drawer } from "vaul";

interface Props {
  children: React.ReactNode;
  cardWidth: number;
  onClose: () => void;
}

const ResponsiveDrawer: React.FC<Props> = ({
  cardWidth,
  children,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const snapPoints = ["150", 1];
  const [snap, setSnap] = React.useState<number | string | null>(snapPoints[1]);

  if (isMobile) {
    return (
      <Drawer.Root
        modal={false}
        open={true}
        snapPoints={snapPoints}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Content
            style={{
              backgroundColor: "#f5f5f5",
              borderTopLeftRadius: "10px",
              borderTopRightRadius: "10px",
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              outline: "none",
            }}
          >
            <div
              style={{
                maxHeight: "100vh",
                overflowY: "auto",
              }}
            >
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <div
      style={{
        width: cardWidth,
        margin: "0 auto",
        // Account for search bar and bottom of map controls
        maxHeight: "calc(100vh - 140px)",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveDrawer;
