import {
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import FilterListIcon from "@material-ui/icons/FilterList";
import MenuIcon from "@material-ui/icons/Menu";
import SearchIcon from "@material-ui/icons/Search";
import centroid from "@turf/centroid";
import {
  FeatureType,
  getLiftNameAndType,
  LiftFeature,
  LiftProperties,
  RunFeature,
  RunProperties,
  SkiAreaFeature,
  SkiAreaProperties,
} from "openskidata-format";
import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { useDetectClickOutside } from "react-detect-click-outside";
import { debounce, throttle } from "throttle-debounce";
import EventBus from "./EventBus";
import { formattedRunUse } from "./Formatters";
import { InfoData } from "./InfoData";

interface Props {
  eventBus: EventBus;
  width: number;
  filtersShown: boolean;
}

interface State {
  searchQuery: string;
  selectedIndex: number;
  results: Result[];
  hideResults: boolean;
}

enum Activity {
  Downhill = "downhill",
  Nordic = "nordic",
  Backcountry = "backcountry",
}

type Result = SkiAreaFeature | LiftFeature | RunFeature;

const SearchBar: React.FC<Props> = (props) => {
  const { width, eventBus, filtersShown } = props;
  const [state, setState] = useState<State>({
    searchQuery: "",
    selectedIndex: 0,
    results: [],
    hideResults: true,
  });

  const results = state.results;
  const hideResults = state.hideResults;

  const stateRef = useRef<State>();
  stateRef.current = state;

  const search = (query: string) => {
    fetch(
      "https://api.openskimap.org/search?query=" + encodeURIComponent(query)
    ).then((response) => {
      if (stateRef.current?.searchQuery === query) {
        response.json().then((results) => {
          setState((prevState) => ({ ...prevState, results }));
        });
      }
    });
  };

  const searchDebounced = useCallback(debounce(500, search), []);
  const searchThrottled = useCallback(throttle(500, search), []);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.keyCode == 38) {
      e.preventDefault();
      setState((prevState) => ({
        ...prevState,
        selectedIndex: Math.max(0, state.selectedIndex - 1),
      }));
    } else if (e.keyCode == 40) {
      e.preventDefault();
      setState((prevState) => ({
        ...prevState,
        selectedIndex: Math.min(
          state.results.length - 1,
          state.selectedIndex + 1
        ),
      }));
    }
  };

  const updateSearchQuery = (query: string) => {
    setState((prevState) => {
      const newState = { ...prevState, searchQuery: query };
      // If the query term is short or ends with a space, trigger the more impatient version.
      if (query.length < 5 || query.endsWith(" ")) {
        searchThrottled(query);
      } else {
        searchDebounced(query);
      }
      return newState;
    });
  };

  const showResult = (result: Result) => {
    setState((prevState) => ({
      ...prevState,
      searchQuery: "",
      selectedIndex: 0,
      results: [],
      hideResults: true,
    }));
    eventBus.showInfo(infoDataForResult(result));
  };

  const ref = useDetectClickOutside({
    onTriggered: () => {
      setState((prevState) => ({ ...prevState, hideResults: true }));
    },
  });

  return (
    <Paper style={{ width: width }} elevation={1} ref={ref}>
      <div style={{ alignItems: "center", display: "flex" }}>
        <IconButton
          style={{ padding: "10" }}
          aria-label="Menu"
          onClick={eventBus.openSidebar}
        >
          <MenuIcon />
        </IconButton>
        <InputBase
          onFocus={() => {
            setState((prevState) => ({ ...prevState, hideResults: false }));
          }}
          style={{ marginLeft: "8", flex: "1" }}
          placeholder="Search Ski Areas, Lifts, and Runs"
          onChange={(e) => {
            setState((prevState) => ({ ...prevState, hideResults: false }));
            updateSearchQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            handleKeyNavigation(e);
            if (e.keyCode === 13 && results.length > state.selectedIndex) {
              showResult(results[state.selectedIndex]);
            }
          }}
          value={state.searchQuery}
        />
        <IconButton
          style={{ padding: "10" }}
          aria-label="Search"
          disabled={state.searchQuery.length == 0}
          onClick={() => {
            if (results.length > 0) {
              showResult(results[0]);
            }
          }}
        >
          <SearchIcon />
        </IconButton>
        <Divider orientation="vertical" />
        <IconButton
          style={{ padding: "10" }}
          color={filtersShown ? "primary" : "default"}
          aria-label="Filters"
          onClick={eventBus.showFilters}
        >
          <FilterListIcon />
        </IconButton>
      </div>
      {results.length > 0 && !hideResults ? (
        <React.Fragment>
          <Divider />
          <SearchResults
            onSelect={showResult}
            selectedIndex={state.selectedIndex}
            results={results}
          />
        </React.Fragment>
      ) : null}
    </Paper>
  );
};

export default SearchBar;

export const SearchResults: React.FunctionComponent<{
  onSelect: (result: Result) => void;
  selectedIndex: number;
  results: Result[];
}> = (props) => {
  let dividerIndex = 0;
  return (
    <List disablePadding={true}>
      {props.results
        .map((result, index) => {
          return (
            <SearchResult
              onSelect={() => {
                props.onSelect(result);
              }}
              selected={props.selectedIndex === index}
              key={result.properties.id}
              result={result}
            />
          );
        })
        .reduce(
          (previous, current) =>
            [
              previous,
              <Divider key={"divider-" + dividerIndex++} />,
              current,
            ] as any
        )}
    </List>
  );
};

function infoDataForResult(result: Result): InfoData {
  const geometry = centroid(result).geometry;
  return {
    id: result.properties.id,
    panToPosition: geometry && [
      geometry.coordinates[0],
      geometry.coordinates[1],
    ],
  };
}

const SearchResult: React.FunctionComponent<{
  result: Result;
  onSelect: () => void;
  selected: boolean;
}> = (props) => {
  return (
    <ListItem button onClick={props.onSelect} selected={props.selected}>
      <ListItemText
        primary={getPrimaryText(props.result)}
        secondary={getSecondaryText(props.result.properties)}
      />
    </ListItem>
  );
};

function getPrimaryText(result: Result): string | null {
  return (
    result.properties.name ||
    result.properties.location?.localized.en.locality ||
    null
  );
}

function getSecondaryText(
  properties: SkiAreaProperties | LiftProperties | RunProperties
): string {
  return [getFeatureDetails(properties), getLocation(properties)]
    .filter(isString)
    .join(" - ");
}

function getFeatureDetails(
  properties: SkiAreaProperties | LiftProperties | RunProperties
) {
  switch (properties.type) {
    case FeatureType.SkiArea:
      return (
        properties.activities
          .map((activity) => {
            switch (activity) {
              case Activity.Downhill:
                return "Downhill";
              case Activity.Nordic:
                return "Nordic";
              case Activity.Backcountry:
                return "Backcountry";
            }
          })
          .join(" and ") + " Ski Area"
      ).trim();
    case FeatureType.Run:
      return formattedRunUse(properties.uses, properties.grooming);
    case FeatureType.Lift:
      return getLiftNameAndType(properties) + " lift";
  }
}

function getLocation(
  properties: SkiAreaProperties | LiftProperties | RunProperties
): string | null {
  let components: string[] = [];

  if (
    properties.type === FeatureType.Lift ||
    properties.type === FeatureType.Run
  ) {
    components.push(
      properties.skiAreas.map((skiArea) => skiArea.properties.name).join(" / ")
    );
  }

  const location = properties.location?.localized.en;
  if (location?.region) {
    components.push(location.region);
  }

  if (location?.country) {
    components.push(location.country);
  }

  const formatted = components.join(", ");
  return formatted.length > 0 ? formatted : null;
}

function isString(e: any): e is string {
  return !!e;
}
