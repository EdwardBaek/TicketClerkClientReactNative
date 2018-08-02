import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Button,
  TouchableOpacity 
} from 'react-native';
import Modal from 'react-native-modal';

import { 
  BASE_URL, 
  API_TICKET_LIST_BY_USER, 
  API_TICKET, 
  API_TICKET_NEW 
} from './api'

const MODAL_TYPES = {
  TICKET_ACTION: 'TICKET_ACTION',
  TICKET_ADD: 'TICKET_ADD'
}

export default class TicketList extends React.Component {
  static navigationOptions = {
    title: `Ticket List`,
  };
  state = {
    isModalVisible: false,
    isLoaded: false,
    userId: 1,
    userNmae: '',
    tickets: [{
      ticketId: 1,
      userId: 1,
      name: 'test',
      issueTime: ''
    }],
    modalData: {
      ticketId: undefined,
      userId: undefined,
      name: undefined
    }
  }

  /*** DATA FUNCTIONS ***/
  formatTicketData (data) {
    return {
      ticketId: data.ticketid,
      userId: data.ownerid,
      name: data.username,
      issueTime: data.issuetime
    }
  }

  // Local data
  deleteTicketOnList = (ticketId) => {
    const tickets = this.state.tickets.filter( ticket => ticket.ticketId !== ticketId );
    this.setState({
      tickets: [...tickets]
    });
  }
  addTicketOnList = (ticket) => {
    this.setState({
      tickets: [...this.state.tickets, ticket]
    })
  }

  // Network
  getTicketList = (userId) => {
    const URL = BASE_URL + API_TICKET_LIST_BY_USER + userId;
    console.log('URL', URL);
    fetch(URL)
      .then(response => response.json())
      .then( json => {
        const ticketList = Array.from(json.rows).map(this.formatTicketData);
        this.setState({
          tickets: ticketList,
          isLoaded: true
        });
      }).catch( err => console.error(err) );
  }

  issueNewTicket = (userId) => {
    const URL = BASE_URL + API_TICKET_NEW;
    console.log('URL', URL);
    fetch(URL,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId
          })
        }
      )
      .then(response => response.json())
      .then( json => {
        const tickets = this.state.tickets;
        const newTicket = Array.from(json.rows).map(this.formatTicketData)[0];
        this.setState({
          tickets: [...tickets, newTicket]
        });
      }).catch( err => console.error(err) );
  }

  deleteTicket = (ticketId) => {
    const URL = BASE_URL + API_TICKET;
    fetch(URL,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ticketId
          })
        }
      )
      .then(response => {
          return response.json();
        }
      )
      .then( json => {
        const deletedTicket = Array.from(json.rows).map(this.formatTicketData)[0];
        const tickets = this.state.tickets.filter( (ticket) => ticket.ticketId !== deletedTicket.ticketId);
        this.setState({
          tickets: [...tickets]
        });
      })
      .catch( err => console.error(err) );
  }

  
  /*** UI Handlers ***/
  handleClickCloseModal = () => {
    this._closeModal();
  }

  handleClickTicket = (item) => {
    this._openModal(MODAL_TYPES.TICKET_ACTION, item);
  };
  handleClickTransferTicket = () => {
    this.props.navigation.navigate('TicketQRCode', 
      {
        ticketInfo: JSON.stringify(this.state.modalData),
        deleteTicketOnList: this.deleteTicketOnList
      }
    );
    this._closeModal();
  }
  handleClickDeleteTicket = () => {
    this.deleteTicket(this.state.modalData.ticketId);
    this._closeModal();
  }

  handleClickAddTicket = () => {
    this._openModal(MODAL_TYPES.TICKET_ADD, undefined);
  }
  handleClickIssueNewTicket = () => {
    this.issueNewTicket(this.state.userId);
    this._closeModal();
  }
  handleClickGetTicket = () => {
    this.props.navigation.navigate('TicketQRCodeReader', {
      userId: this.state.userId,
      addTicketOnList: this.addTicketOnList
    });
    this._closeModal();
  }
  
  _openModal = (type, ticketInfo) => {
    const isModalVisible = type;
    if(!ticketInfo) {
      ticketInfo = {};
    }
    const { ticketId, userId, name } = ticketInfo;
    this.setState({
      isModalVisible,
      modalData : {
        ticketId, 
        userId, 
        name
      }
    });
  }
  _closeModal = () => {
    const isModalVisible = false;
    let ticketId, userId, name;
    this.setState({
      isModalVisible,
      modalData : {
        ticketId, 
        userId, 
        name
      }
    });
  }

  // React LifeCycle
  componentDidMount() {
    const { navigation } = this.props;
    const userId = navigation.getParam('userId', 1);
    this.setState({userId});
    this.getTicketList(userId);
  }

  render() {
    const { tickets, isLoaded } = this.state;
    const { 
      handleClickTicket, 
      handleClickTransferTicket,
      handleClickDeleteTicket,
      handleClickCloseModal, 
      handleClickAddTicket,
      handleClickIssueNewTicket, 
      handleClickGetTicket,
    } = this;
    
    const button = (title, fn, index) => {
      return (
        <View key={index}
          style={styles.buttonWrapper}>
          <Button
            title={title}
            onPress={() => {
              if( typeof fn === 'function') fn();
            }
          }  
          />
      </View>
      )
    }
    const ticketActions = [
      { 
        title: "Transfer with QRCode",
        fn: handleClickTransferTicket
      },
      { 
        title: "Delete Ticket",
        fn: handleClickDeleteTicket
      },
      { 
        title: "close",
        fn: handleClickCloseModal
      },
    ];
    const ticketActionModalButtons = ticketActions.map( 
      ( action, index ) => (
      button(action.title, action.fn, index)
    ));
    const AddticketActions = [
      { 
        title: "Issue New Ticket",
        fn: handleClickIssueNewTicket
      },
      { 
        title: "Get the ticket by QR-CODE",
        fn: handleClickGetTicket
      },
      { 
        title: "close",
        fn: handleClickCloseModal
      },
    ]
    const AddticketActionModalButtons = AddticketActions.map( 
      (action, index) => (
      button(action.title, action.fn, index)
    ));
    
    
    return (
      <View style={styles.container}>
        <Modal 
          isVisible={this.state.isModalVisible === MODAL_TYPES.TICKET_ACTION}
          onBackdropPress = {() => handleClickCloseModal()}
        >
          <View style={styles.modalContent}>
            <Text>
              ticketId:{this.state.modalData.ticketId}
            </Text>
            { ticketActionModalButtons }
          </View>
        </Modal>

        <Modal 
          isVisible={this.state.isModalVisible === MODAL_TYPES.TICKET_ADD}
          onBackdropPress = {() => handleClickCloseModal()}
        >
          <View style={styles.modalContent}>
            <Text>GET NEW TICKET</Text>
            { AddticketActionModalButtons }
          </View>
        </Modal>
        
        { isLoaded && (
          <View style={styles.listWrapper}>
            <FlatList
              data={tickets}
              showsHorizontalScrollIndicator={true}
              keyExtractor={(item,index) => index.toString()}
              renderItem={
                ({item}) =>
                <TouchableOpacity
                  onPress={ () => handleClickTicket(item) }
                >
                  <View style={styles.ticket}>
                    <Text style={styles.ticketText}
                    >Ticket{item.ticketId}/{item.userId}-{item.name}</Text>
                  </View>
                </TouchableOpacity>
              }
            />
            <TouchableOpacity
              onPress={ () => handleClickAddTicket() }
            >
              <View style={styles.addButton}>
                <Text style={styles.ticketText}>+</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) }
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
  ticket: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: 'gray',
    minHeight: 80
  },
  ticketText: {
    justifyContent: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    borderRadius: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)'
  },
  buttonWrapper: {
    margin: 8
  },
  button: {
    alignItems: 'center',
    margin: 8,
    padding: 8,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#BBB'
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: 'gray',
    minHeight: 50
  },
})