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
import * as lunr from "lunr";
import * as React from "react";
import EventBus from "./EventBus";
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
  Downhill = "DOWNHILL",
  Nordic = "NORDIC",
  Backcountry = "BACKCOUNTRY"
}

interface Result {
  lid: string;
  text: string;
  activities: Activity[];
  geometry: GeoJSON.Point;
}

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
        {this.state.results.length > 0 ? (
          <React.Fragment>
            <Divider />
            <SearchResults {...this.state.results} />
          </React.Fragment>
        ) : null}
      </Paper>
    );
  }
}

function results(text: string, searchIndex: SearchIndex | null): Result[] {
  if (searchIndex) {
    const results = searchIndex.index.search(text);
    return results.map(result => {
      const data = searchIndex.data[result.ref];
      return {
        lid: "",
        text: data.name,
        activities: [] as Activity[],
        geometry: {
          type: "Point",
          coordinates: data.coordinates
        } as GeoJSON.Point
      };
    });
  }
  return [];
}

export const SearchResults: React.FunctionComponent<Result[]> = results => {
  return (
    <List>
      {results
        .map(result => {
          return <SearchResult key={result.lid} {...result} />;
        })
        .reduce((previous, current) => [previous, <Divider />, current] as any)}
    </List>
  );
};

const SearchResult: React.FunctionComponent<Result> = result => {
  return (
    <ListItem>
      <ListItemText
        primary={result.text}
        secondary={result.activities
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
