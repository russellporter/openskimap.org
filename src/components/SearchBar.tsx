import {
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper
} from "@material-ui/core";
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
  results: Result[];
  searchIndex: SearchIndex | null;
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
    this.state = { searchQuery: "", results: [], searchIndex: null };
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

  render() {
    const width = this.props.width;
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
                results: results(e.target.value, this.state.searchIndex)
              });
            }}
          />
          <IconButton
            className={styles.iconButton}
            aria-label="Search"
            disabled={this.state.searchQuery.length == 0}
            onClick={() => {}}
          >
            <SearchIcon />
          </IconButton>
        </div>
        {this.state.results.length > 0 ? (
          <React.Fragment>
            <Divider />
            <SearchResults
              eventBus={this.props.eventBus}
              results={this.state.results}
            />
          </React.Fragment>
        ) : null}
      </Paper>
    );
  }
}

function results(text: string, searchIndex: SearchIndex | null): Result[] {
  if (searchIndex) {
    const results = searchIndex.index.search(text);
    return results.map(result => searchIndex.data[result.ref]);
  }
  return [];
}

export const SearchResults: React.FunctionComponent<{
  eventBus: EventBus;
  results: Result[];
}> = props => {
  return (
    <List disablePadding={true}>
      {props.results
        .map(result => {
          return (
            <SearchResult
              eventBus={props.eventBus}
              key={result.properties.lid}
              result={result}
            />
          );
        })
        .reduce((previous, current) => [previous, <Divider />, current] as any)}
    </List>
  );
};

const SearchResult: React.FunctionComponent<{
  result: Result;
  eventBus: EventBus;
}> = props => {
  return (
    <ListItem
      button
      onClick={() => {
        props.eventBus.showInfo({
          lid: props.result.properties.lid,
          panToPosition:
            props.result.geometry.type == "Point"
              ? props.result.geometry.coordinates
              : null
        });
      }}
    >
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
