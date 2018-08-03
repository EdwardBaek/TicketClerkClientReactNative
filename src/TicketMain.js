import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  Alert
} from 'react-native';
import axios from 'axios';

import { 
  BASE_URL, 
  API_TICKET_LIST_DELETE_ALL, 
  API_TICKET_TRANSFER_LIST_DELETE_ALL, 
} from './api'

export default class TicketMain extends React.Component {
  static navigationOptions = {
    title: `Ticket Clerk`,
  };

  /*** DATA FUNCTIONS ***/
  deleteTicketList = () => {
    const URL = BASE_URL + API_TICKET_LIST_DELETE_ALL;
    console.log('URL', URL);
    axios.delete(URL).then(res=>res.data)
      .then( json => {
        const title = 'Delete Result';
        const text = `Deleted ${json.rowCount} ticket(s)`;
        this.simpleAlert(title, text);
      }).catch( err => console.error(err) );
  }

  deleteTransferList = () => {
    const URL = BASE_URL + API_TICKET_TRANSFER_LIST_DELETE_ALL;
    console.log('URL', URL);
    axios.delete(URL).then(res=>res.data)
      .then( json => {
        const title = 'Delete Result';
        const text = `Deleted ${json.rowCount} transfer(s)`;
        this.simpleAlert(title, text);
      })
      .catch( err => console.error(err) );
  }

  /*** UI Handlers ***/
  simpleAlert = (title, content, fns = { text: 'Close', onPress: false }, cancelable = true) => {
    if (typeof actionFn !== 'funciton') actionFn = false;
    if (typeof cancelFn !== 'funciton') cancelFn = false;
    Alert.alert(
      title,
      content,
      [ fns ],
      { cancelable: cancelable }
    );
  }

  render() {
    const { navigate } = this.props.navigation;
    const { deleteTicketList, deleteTransferList } = this;
    const boxButton = (title, fn, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => {
            if( typeof fn === 'function' ) fn();
          }
        }
      >
        <View style={styles.box}>
          <Text style={styles.boxText}>
            {title}
          </Text>
        </View>
      </TouchableOpacity>
    );
    const navigateToTicketList = (userId) => ( 
      navigate('TicketList', {userId}) 
    );
    
    const buttonActions = [
      {
        title: 'Go to TicketList For User1',
        fn: () => { navigateToTicketList(1); }
      },
      {
        title: 'Go to TicketList For User2',
        fn: () => { navigateToTicketList(2); }
      },
      {
        title: 'Go to TicketList For User3',
        fn: () => { navigateToTicketList(3); }
      },
      {
        title: 'Delete All Tickets',
        fn: deleteTicketList
      },
      {
        title: 'Delete All transfers',
        fn: deleteTransferList
      },
    ];
    const boxButtons = buttonActions.map( (action, index) => 
      boxButton(action.title, action.fn, index) 
    );

    return (
      <View style={StyleSheet.container}>
        { boxButtons }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
    justifyContent: 'flex-start',
  },
  listWrapper: {
    flex: 1,
    marginBottom: 30
  },
  box: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: 'gray',
    minHeight: 80
  },
  boxText: {
    justifyContent: 'center'
  },
});