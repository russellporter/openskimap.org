import { Button } from "@mui/material";

export function getWebsiteActions(websites: string[]): JSX.Element[] {
  if (websites.length === 0) {
    return [];
  }

  return websites.map((website, index) => (
    <Button
      key={`website-${index}`}
      size="small"
      color="primary"
      target="_blank"
      href={website}
    >
      Website {index > 0 ? "(alternate)" : ""}
    </Button>
  ));
}
