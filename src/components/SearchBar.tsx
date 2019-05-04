import { Divider, List, ListItem, ListItemText, Paper } from "@material-ui/core";
import IconButton from "@material-ui/core/IconButton";
import InputBase from "@material-ui/core/InputBase";
import MenuIcon from "@material-ui/icons/Menu";
import SearchIcon from "@material-ui/icons/Search";
import { Feature, Geometry } from "geojson";
import * as lunr from "lunr";
import * as React from "react";
import EventBus from "./EventBus";
import { SkiAreaData } from "./MapData";
import * as styles from "./SearchBar.css";

interface Props {
  eventBus: EventBus;
  width: number;
  searchIndexURL: string;
}

interface State {
  searchQuery: string;
  searchIndex: SearchIndex | null;
  selectedIndex: number;
}

interface SearchIndex {
  index: lunr.Index;
  data: any;
}

enum Activity {
  Downhill = "downhill",
  Nordic = "nordic",
  Backcountry = "backcountry"
}

type Result = Feature<Geometry, SkiAreaData>;

export default class SearchBar extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { searchQuery: "", searchIndex: null, selectedIndex: 0 };
  }

  componentDidMount() {
    // TODO: Move to a server side search index
    fetch(this.props.searchIndexURL)
      .then(response => {
        return response.json();
      })
      .then(json => {
        this.setState({
          searchIndex: {
            index: lunr.Index.load(json.index),
            data: json.skiAreas
          }
        });
      });
  }

  private handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.keyCode == 38) {
      e.preventDefault();
      this.setState({
        selectedIndex: Math.max(0, this.state.selectedIndex - 1)
      });
    } else if (e.keyCode == 40) {
      e.preventDefault();
      const resultsLength = getResults(
        this.state.searchQuery,
        this.state.searchIndex
      ).length;
      this.setState({
        selectedIndex: Math.min(resultsLength - 1, this.state.selectedIndex + 1)
      });
    }
  };

  render() {
    const width = this.props.width;
    const results = getResults(this.state.searchQuery, this.state.searchIndex);
    const showResult = (result: Result) => {
      this.setState({ searchQuery: "", selectedIndex: 0 });
      this.props.eventBus.showInfo(infoDataForResult(result));
    };

    return (
      <Paper className={styles.root} style={{ width: width }} elevation={1}>
        <div style={{ alignItems: "center", display: "flex" }}>
          <IconButton
            className={styles.iconButton}
            aria-label="Menu"
            onClick={this.props.eventBus.openSidebar}
          >
            <MenuIcon />
          </IconButton>
          <InputBase
            className={styles.input}
            placeholder="Search Ski Areas"
            onChange={e => {
              this.setState({
                searchQuery: e.target.value
              });
            }}
            onKeyDown={e => {
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
            className={styles.iconButton}
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
        </div>
        {results.length > 0 ? (
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
    );
  }
}

function getResults(text: string, searchIndex: SearchIndex | null): Result[] {
  text = text.trim()
  if (searchIndex && text.length > 0) {
    const results = searchIndex.index.search(text);
    return results.map(result => searchIndex.data[result.ref]);
  }
  return [];
}

export const SearchResults: React.FunctionComponent<{
  onSelect: (result: Result) => void;
  selectedIndex: number;
  results: Result[];
}> = props => {
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
              key={result.properties.lid}
              result={result}
            />
          );
        })
        .reduce(
          (previous, current) =>
            [
              previous,
              <Divider key={"divider-" + dividerIndex++} />,
              current
            ] as any
        )}
    </List>
  );
};

function infoDataForResult(result: Result) {
  return {
    lid: result.properties.lid,
    panToPosition:
      result.geometry.type == "Point" ? result.geometry.coordinates : null
  };
}

const SearchResult: React.FunctionComponent<{
  result: Result;
  onSelect: () => void;
  selected: boolean;
}> = props => {
  return (
    <ListItem button onClick={props.onSelect} selected={props.selected}>
      <ListItemText
        primary={props.result.properties.name}
        secondary={props.result.properties.activities
          .map(activity => {
            switch (activity) {
              case Activity.Downhill:
                return "Downhill";
              case Activity.Nordic:
                return "Nordic";
              case Activity.Backcountry:
                return "Backcountry";
            }
          })
          .join(" and ")}
      />
    </ListItem>
  );
};
