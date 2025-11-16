import FilterListIcon from "@mui/icons-material/FilterList";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import {
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import centroid from "@turf/centroid";
import {
  FeatureType,
  getLiftNameAndType,
  LiftFeature,
  LiftProperties,
  Place,
  RunFeature,
  RunProperties,
  SkiAreaActivity,
  SkiAreaFeature,
  SkiAreaProperties,
} from "openskidata-format";
import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { useDetectClickOutside } from "react-detect-click-outside";
import { debounce, throttle } from "throttle-debounce";
import { MapMarker } from "../MapMarker";
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


type CommandResult = { type: "add_marker"; data: MapMarker };
type LocationResult = {
  type: "location";
  data: SkiAreaFeature | LiftFeature | RunFeature;
};
type Result = CommandResult | LocationResult;

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

  const processSearchResults = (
    query: string,
    locationResultsData: LocationResult["data"][]
  ) => {
    let results: Result[] = [];

    // If query is a valid coordinate, add a command to add a marker.
    const coordinates = query
      .split(",")
      .map((s) => parseFloat(s.trim()))
      // Represent as [longitude, latitude] (GeoJSON format)
      .reverse();
    if (
      coordinates.length === 2 &&
      coordinates.every((c) => !isNaN(c)) &&
      coordinates[1] >= -90 &&
      coordinates[1] <= 90 &&
      coordinates[0] >= -180 &&
      coordinates[0] <= 180
    ) {
      results.push({
        type: "add_marker",
        data: { type: "Point", coordinates },
      });
    }

    results = results.concat(
      locationResultsData.map((resultData: LocationResult["data"]) => ({
        type: "location",
        data: resultData,
      }))
    );

    setState((prevState: State) => ({ ...prevState, results }));
  };

  const search = (query: string) => {
    fetch(
      "https://api.openskimap.org/search?query=" + encodeURIComponent(query)
    ).then((response) => {
      if (stateRef.current?.searchQuery === query) {
        response
          .json()
          .then((locationResultsData: LocationResult["data"][]) => {
            processSearchResults(query, locationResultsData);
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
    switch (result.type) {
      case "add_marker":
        eventBus.addMarker(result.data);
        break;
      case "location":
        eventBus.showInfo(infoDataForResult(result));
        break;
    }
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
          size="large"
        >
          <MenuIcon />
        </IconButton>
        <InputBase
          name="search"
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
          size="large"
        >
          <SearchIcon />
        </IconButton>
        <Divider orientation="vertical" />
        <IconButton
          style={{ padding: "10" }}
          color={filtersShown ? "primary" : "default"}
          aria-label="Filters"
          onClick={eventBus.showFilters}
          size="large"
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
    <div
      style={{
        maxHeight: "calc(100dvh - 70px)",
        overflowY: "auto",
      }}
    >
      <List disablePadding={true}>
        {props.results
          .map((result, index) => {
            return (
              <SearchResult
                onSelect={() => {
                  props.onSelect(result);
                }}
                selected={props.selectedIndex === index}
                key={resultID(result)}
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
    </div>
  );
};

function resultID(result: Result): string {
  switch (result.type) {
    case "add_marker":
      return "add_marker";
    case "location":
      return "location_" + result.data.properties.id;
  }
}

function infoDataForResult(result: LocationResult): InfoData {
  const feature = result.data;
  const geometry = centroid(feature).geometry;
  return {
    id: result.data.properties.id,
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
    <ListItemButton onClick={props.onSelect} selected={props.selected}>
      <ListItemText
        primary={getPrimaryText(props.result)}
        secondary={getSecondaryText(props.result)}
        primaryTypographyProps={{
          sx: {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineClamp: 3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }
        }}
      />
    </ListItemButton>
  );
};

function getPrimaryText(result: Result): string | null {
  switch (result.type) {
    case "add_marker":
      return "Mark Location";
    case "location":
      const properties = result.data.properties;
      const name = properties.name;
      if (name) {
        return name;
      }

      const locality =
        properties.type === FeatureType.SkiArea
          ? properties.places.find((place) => place.localized.en.locality)?.localized.en.locality
          : null;
      return locality ?? null;
  }
}

function getSecondaryText(result: Result): string {
  switch (result.type) {
    case "add_marker":
      const [longitude, latitude] = result.data.coordinates;
      const latDirection = latitude >= 0 ? "N" : "S";
      const lonDirection = longitude >= 0 ? "E" : "W";
      return `Location: ${Math.abs(latitude)}°${latDirection}, ${Math.abs(longitude)}°${lonDirection}`;
    case "location":
      const properties = result.data.properties;
      return [getFeatureDetails(properties), getLocation(properties)]
        .filter(isString)
        .join(" - ");
  }
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
              case SkiAreaActivity.Downhill:
                return "Downhill";
              case SkiAreaActivity.Nordic:
                return "Nordic";
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

  let places = properties.places;
  if (
    properties.type === FeatureType.Lift ||
    properties.type === FeatureType.Run
  ) {
    const skiAreaNames = properties.skiAreas.map((skiArea) => skiArea.properties.name).filter(isString)
    if (skiAreaNames.length > 0) {
    components.push(skiAreaNames.join(" / "));
    }
  }

  const regions = getUniqueLocalizedValues("region", places);
  if (regions.length > 0) {
    components.push(regions.join(" / "));
  }

  const countries = getUniqueLocalizedValues("country", places);
  if (countries.length > 0) {
    components.push(countries.join(" / "));
  }

  const formatted = components.join(", ");
  return formatted.length > 0 ? formatted : null;
}

function isString(e: any): e is string {
  return !!e;
}

function getUniqueLocalizedValues<T extends keyof Place["localized"]["en"]>(
  key: T,
  places: Place[]
): string[] {
  return [
    ...new Set(
      places
        .map((place) => place.localized.en[key])
        .filter((value): value is NonNullable<typeof value> => value != null)
    ),
  ];
}
