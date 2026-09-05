import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  FormControlLabel,
  Link,
  Typography,
} from "@mui/material";
import {
  getSourceName,
  getSourceURL,
  SkiPass,
  SkiPassCatalog,
  Source,
  SourceType,
} from "openskidata-format";
import * as React from "react";
import {
  groupSkiPasses,
  loadSkiPassCatalog,
  SkiPassFilterKey,
  SkiPassGroup,
  toggleSkiPassSelection,
} from "../SkiPasses";
import { ModalHeader } from "./ModalHeader";

export interface SkiPassesModalProps {
  open: boolean;
  onClose: () => void;
  selected: SkiPassFilterKey[];
  onChange: (selected: SkiPassFilterKey[]) => void;
}

function skiAreaCountText(count: number): string {
  return `${count} ski area${count === 1 ? "" : "s"}`;
}

function passSources(catalog: SkiPassCatalog): Source[] {
  const sources = new Map<string, Source>();
  for (const entity of [...catalog.brands, ...catalog.passes]) {
    for (const source of entity.sources) {
      sources.set(`${source.type} ${source.id}`, source);
    }
  }
  return [...sources.values()];
}

const SkiPassRow: React.FunctionComponent<{
  pass: SkiPass;
  selected: SkiPassFilterKey[];
  onToggle: (key: SkiPassFilterKey, checked: boolean) => void;
  indented?: boolean;
}> = ({ pass, selected, onToggle, indented = false }) => (
  <FormControlLabel
    sx={{ display: "flex", pl: indented ? 4 : 0 }}
    control={
      <Checkbox
        size={indented ? "small" : "medium"}
        checked={selected.includes(pass.id)}
        onChange={(event) => onToggle(pass.id, event.target.checked)}
      />
    }
    label={
      <Box>
        <Typography variant={indented ? "body2" : "body1"}>
          {pass.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {skiAreaCountText(pass.skiAreaCount)}
        </Typography>
      </Box>
    }
  />
);

const SkiPassBrandRow: React.FunctionComponent<{
  group: SkiPassGroup;
  selected: SkiPassFilterKey[];
  onToggle: (key: SkiPassFilterKey, checked: boolean) => void;
}> = ({ group, selected, onToggle }) => {
  const [expanded, setExpanded] = React.useState(false);
  const contentID = `ski-pass-brand-${group.brand.id}`;
  return (
    <Box>
      <ButtonBase
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={contentID}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${group.brand.name} passes`}
        sx={(theme) => ({
          width: "100%",
          display: "flex",
          alignItems: "center",
          py: 0.5,
          borderRadius: 1,
          textAlign: "left",
          "&:hover": {
            bgcolor: "action.hover",
          },
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body1">{group.brand.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {group.passes.length} passes
          </Typography>
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ButtonBase>
      <Collapse id={contentID} in={expanded} unmountOnExit>
        {group.passes.map((pass) => (
          <SkiPassRow
            key={pass.id}
            pass={pass}
            selected={selected}
            onToggle={onToggle}
            indented
          />
        ))}
      </Collapse>
    </Box>
  );
};

export const SkiPassesModal: React.FunctionComponent<SkiPassesModalProps> = (
  props,
) => {
  const [catalog, setCatalog] = React.useState<SkiPassCatalog | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!props.open || catalog !== null) return;
    let cancelled = false;
    loadSkiPassCatalog()
      .then((loaded) => {
        if (!cancelled) setCatalog(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [props.open, catalog]);

  const grouped = catalog === null ? null : groupSkiPasses(catalog);
  const toggle = (key: SkiPassFilterKey, checked: boolean) => {
    props.onChange(toggleSkiPassSelection(key, checked, props.selected));
  };
  const sources = catalog === null ? [] : passSources(catalog);

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 3 }}>
        <ModalHeader onClose={props.onClose}>
          <Typography variant="h6">Ski Passes</Typography>
        </ModalHeader>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Show only ski areas on the passes you hold.
        </Typography>

        {failed && (
          <Alert severity="error">Ski passes could not be loaded.</Alert>
        )}
        {!failed && catalog === null && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {catalog !== null && grouped !== null && (
          <>
            <Box sx={{ maxHeight: "50vh", overflowY: "auto" }}>
              {grouped.groups.map((group) => (
                <SkiPassBrandRow
                  key={group.brand.id}
                  group={group}
                  selected={props.selected}
                  onToggle={toggle}
                />
              ))}
              {grouped.standalone.map((pass) => (
                <SkiPassRow
                  key={pass.id}
                  pass={pass}
                  selected={props.selected}
                  onToggle={toggle}
                />
              ))}
            </Box>
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ display: "block", mt: 2 }}
            >
              Ski pass data from{" "}
              {sources.length > 0 ? (
                <Link href={getSourceURL(sources[0])} target="_blank">
                  {getSourceName(SourceType.STORM_SKIING)}
                </Link>
              ) : (
                getSourceName(SourceType.STORM_SKIING)
              )}
              .
            </Typography>
          </>
        )}

        <DialogActions sx={{ px: 0, pb: 0 }}>
          <Button
            size="small"
            disabled={props.selected.length === 0}
            onClick={() => props.onChange([])}
          >
            Clear
          </Button>
          <Button size="small" onClick={props.onClose}>
            Done
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
