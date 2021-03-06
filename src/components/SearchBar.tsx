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
import OutsideClickHandler from "react-outside-click-handler";
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

export default class SearchBar extends React.Component<Props, State> {
  searchDebounced: debounce<(query: string) => void>;
  searchThrottled: throttle<(query: string) => void>;

  constructor(props: Props) {
    super(props);
    this.state = {
      searchQuery: "",
      selectedIndex: 0,
      results: [],
      hideResults: true,
    };
    this.searchDebounced = debounce(500, this.search);
    this.searchThrottled = throttle(500, this.search);
  }

  private updateSearchQuery = (query: string) => {
    this.setState({ searchQuery: query }, () => {
      // If the query term is short or ends with a
      // space, trigger the more impatient version.
      if (query.length < 5 || query.endsWith(" ")) {
        this.searchThrottled(query);
      } else {
        this.searchDebounced(query);
      }
    });
  };

  private search = (query: string) => {
    fetch(
      "https://api.openskimap.org/search?query=" + encodeURIComponent(query)
    ).then((response) => {
      if (this.state.searchQuery === query) {
        response.json().then((results) => {
          this.setState({ results: results });
        });
      }
    });
  };

  private handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.keyCode == 38) {
      e.preventDefault();
      this.setState({
        selectedIndex: Math.max(0, this.state.selectedIndex - 1),
      });
    } else if (e.keyCode == 40) {
      e.preventDefault();
      this.setState({
        selectedIndex: Math.min(
          this.state.results.length - 1,
          this.state.selectedIndex + 1
        ),
      });
    }
  };

  render() {
    const width = this.props.width;
    const results = this.state.results;
    const hideResults = this.state.hideResults;
    const showResult = (result: Result) => {
      this.setState({
        searchQuery: "",
        selectedIndex: 0,
        results: [],
        hideResults: true,
      });
      this.props.eventBus.showInfo(infoDataForResult(result));
    };

    return (
      <OutsideClickHandler
        onOutsideClick={() => {
          this.setState({ hideResults: true });
        }}
      >
        <Paper style={{ width: width }} elevation={1}>
          <div style={{ alignItems: "center", display: "flex" }}>
            <IconButton
              style={{ padding: "10" }}
              aria-label="Menu"
              onClick={this.props.eventBus.openSidebar}
            >
              <MenuIcon />
            </IconButton>
            <InputBase
              onFocus={() => {
                this.setState({ hideResults: false });
              }}
              style={{ marginLeft: "8", flex: "1" }}
              placeholder="Search Ski Areas, Lifts, and Runs"
              onChange={(e) => {
                this.setState({ hideResults: false });
                this.updateSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                this.handleKeyNavigation(e);
                if (
                  e.keyCode === 13 &&
                  results.length > this.state.selectedIndex
                ) {
                  showResult(results[this.state.selectedIndex]);
                }
              }}
              value={this.state.searchQuery}
            />
            <IconButton
              style={{ padding: "10" }}
              aria-label="Search"
              disabled={this.state.searchQuery.length == 0}
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
              color={this.props.filtersShown ? "primary" : "default"}
              aria-label="Filters"
              onClick={() => {
                this.props.eventBus.showFilters();
              }}
            >
              <FilterListIcon />
            </IconButton>
          </div>
          {results.length > 0 && !hideResults ? (
            <React.Fragment>
              <Divider />
              <SearchResults
                onSelect={showResult}
                selectedIndex={this.state.selectedIndex}
                results={results}
              />
            </React.Fragment>
          ) : null}
        </Paper>
      </OutsideClickHandler>
    );
  }
}

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
