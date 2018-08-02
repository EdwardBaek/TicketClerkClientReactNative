import React, { Component } from 'react';
import {
  Alert,
  Dimensions,
  Text,
  View,
  StatusBar,
  StyleSheet,
  Button
} from 'react-native';
import { BarCodeScanner, Permissions } from 'expo';

import { 
  BASE_URL, 
  API_TICKET_TRANSFER_DETAIL_BY_ID, 
  API_TICKET_TRANSFER_APPLY,
  API_TICKET_DETAIL
} from './api'

export default class TicketQRCodeReader extends Component {
  static navigationOptions = {
    title: `QR CODE Reader`,
  };

  DEFAULT_POOL_TRY_LIMIT = 10;
  allowPooling = false;
  state = {
    hasCameraPermission: undefined,
    lastScannedUrl: undefined,
    hasRead: undefined,
    userId: undefined,
    transferId: undefined,
    isPoolOn: false,
    allowance: undefined,
    poolTry: 0,
    poolTryLimit: this.DEFAULT_POOL_TRY_LIMIT,
    newTicket: {
      ticketId: undefined,
      onwerId: undefined,
      userName: undefined,
      issueTime: undefined,
    }
  };
  
  // BarCodeScanner
  requestCameraPermission = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted',
    });
  };
  handleBarCodeRead = async (result) => {
    if( this.state.hasRead ) return;
    
    this.setState({ hasRead: true, lastScannedUrl: result.data });
    
    const transferData = JSON.parse('{"' + decodeURI(result.data).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
    const { transferId, ticketId } = transferData;
    const ticketData = await this.getTicketDetail(ticketId);
    this.setState({transferId});
    
    Alert.alert(
      'QR CODE',
      `ticket id is ${ticketData.ticketId} from ${ticketData.name}`,
      [
        {
          text: 'Right',
          onPress: () => this.handleApplyTransfer(transferData.transferId)
        },
        { 
          text: 'ReTry', 
          onPress: () => {
            this.setState({
              hasRead: false,
              lastScannedUrl: false
            });
          } 
        },
        { 
          text: 'Cancel', 
          onPress: () => this.props.navigation.goBack()
        },
      ],
      { cancelable: false }
    );

  };


  /*** DATA FUNCTIONS ***/
  // Local data
  formatTicketData (data) {
    return {
      ticketId: data.ticketid,
      userId: data.ownerid,
      name: data.username,
      issueTime: data.issuetime
    }
  }
  formatTransferData (data) {
    return {
      transferId: data.transferid,
      ticketId: data.ticketid,
      idFrom: data.idfrom,
      nameFrom: data.namefrom,
      idTo: data.idto,
      nameTo: data.nameto,
      allowance: data.allowance,
      regTime: data.regtime,
      transferTime: data.transfertime,
    }
  }

  // Network
  getTicketDetail = async (ticketId) => {
    try {
      const URL = BASE_URL + API_TICKET_DETAIL + ticketId;
      console.log('URL', URL);
      return result = await fetch(URL)
        .then(response => response.json())
        .then( json => {
          const ticket = Array.from(json.rows).map(this.formatTicketData)[0];
          return ticket;
        });
    } catch (err) {
      console.error(err);
    }
    
  }
  handleApplyTransfer = async (transferId) => {
    try {
      const URL = BASE_URL + API_TICKET_TRANSFER_APPLY;
      const idTo = this.state.userId;
      console.log('URL', URL);
      await fetch(URL, 
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: transferId,
            idTo
          })
        }
      ).then( response => response.json() );
      this.setGetTransferInfoPooling();
      this.setState({isPoolOn:true});
    } catch (err) {
      console.error(err);
    }
  }

  // Pooling
  // TODO: extract as module
  setGetTransferInfoPooling() {
    this.setPoolDefaultValue();
    this.runPolling();
  }
  setPoolDefaultValue = () => {
    this.allowPooling = true;
    this.setState({
      poolTry: 0,
      poolTryLimit: this.DEFAULT_POOL_TRY_LIMIT
    });
  }
  setPoolStopValue = () => {
    this.allowPooling = false;
  }
  getPollForFindReceiverInfo = () => {
    const id = this.state.transferId;
    const URL = BASE_URL + API_TICKET_TRANSFER_DETAIL_BY_ID + id;
    console.log('URL', URL);
    return function *poll () {
      while(true) {
        yield fetch(URL)
          .then( (response) => response.json() )
          .catch(err => console.log(err))
      }
    }
  }
  runPolling = (generator) => {
    if(!generator) {
      generator = this.getPollForFindReceiverInfo()();
    }
    let p = generator.next();
    p.value.then( (data) => {
      if( !this.allowPooling ) return;
      const formatedData = Array.from(data.rows).map(this.formatTransferData)[0];
      let poolTry = this.state.poolTry;
      let poolTryLimit = this.state.poolTryLimit;
      if( poolTryLimit <= 0 ) {
        this.watingTimeoverAlert('Timeout');
        return;
      }

      // check there is approval to transfer by allowance value
      if( !formatedData || formatedData.allowance === null ) {
        setTimeout( () => {
        poolTry += 1;
        poolTryLimit -= 1;
        this.setState({poolTry, poolTryLimit});
        this.runPolling(generator);
      }, 1000);
      } else {
        const ticketId = formatedData.ticketId;
        const userId = formatedData.idTo;
        const name = formatedData.nameTo;
        const issueTime = formatedData.transferTime;
        const ticket = {
          ticketId,
          userId,
          name,
          issueTime
        }
        this.setState({ newTicket: ticket });
        this.resultAlert(formatedData.allowance);
      }
    });
  }

  handleClickResult = (allowance) => {
    this.props.navigation.goBack();
    if ( allowance )
      this.props.navigation.state.params.addTicketOnList(this.state.newTicket);
  }

  /*** UI Handlers ***/
  resultAlert = (allowance) => {
    Alert.alert(
      'Transfer',
      allowance ? 'Succeeded' : 'Rejected or canceled',
      [
        {
          text: 'OK',
          onPress: () => this.handleClickResult(allowance)
        }
      ],
      { cancelable: false}
    );
  }
  watingTimeoverAlert = () => {
    Alert.alert(
      'Wating Time Over',
      '',
      [
        {
          text: `Keep Waiting`, 
          onPress: () => this.setGetTransferInfoPooling()
        },
        {
          text: `Cancel`, 
          onPress: () => this.props.navigation.goBack()
        },
      ],
      { cancelable: false}
    );
  }

  // React Life Cycle
  componentDidMount() {
    console.log('componentDidMount');
    this.requestCameraPermission();
    const userId = this.props.navigation.getParam('userId', 1);
    this.setState({userId});
  }
  componentWillUnmount () {
    console.log('componentWillUnmount');
    this.setPoolStopValue();
  }

  render() {
    const { isPoolOn, hasCameraPermission } = this.state;
    return (
      <View style={styles.container}>
        { hasCameraPermission === null
          ? <Text>Requesting for camera permission</Text>
          : hasCameraPermission === false
              ? <Text style={{ color: '#fff' }}>
                  Camera permission is not granted
                </Text>
              : !isPoolOn ? 
                (
                  <BarCodeScanner
                    onBarCodeRead={this.handleBarCodeRead}
                    style={{
                      height: Dimensions.get('window').height * 0.5,
                      width: Dimensions.get('window').width * 0.75,
                    }}
                  />
                )
                : (<View><Text style={{color:'white'}}>now waiting approval...</Text></View>)
        }

        {  (
          <View style={styles.bottomBar}>
            <View style={styles.buttonWrapper}>
              <Button
                title="Cancel"
                onPress={() => this.props.navigation.goBack()}            
              />
            </View>
          </View>
        )}

        <StatusBar hidden />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  cancelButton: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
  },
  buttonWrapper: {
    margin: 8,
  },
});
