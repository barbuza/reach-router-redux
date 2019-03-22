import React from 'react';
import { connect } from 'react-redux';
import { HistoryLocation, Router } from '@reach/router';

type ReduxLocationProps = {
  location: HistoryLocation;
};

export function createRouter<State>(getLocation: (state: State) => HistoryLocation): React.ComponentClass {
  class ReduxRouterComponent extends React.PureComponent<ReduxLocationProps> {
    render() {
      return <Router location={this.props.location}>{this.props.children}</Router>;
    }
  }
  return connect((state: State) => ({ location: getLocation(state) }))(ReduxRouterComponent);
}
