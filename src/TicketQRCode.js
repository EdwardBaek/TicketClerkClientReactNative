import React from 'react';
import QRCode from 'react-native-qrcode';

import {
  StyleSheet,
  View,
  Text,
  Alert
} from 'react-native';
import axios from 'axios';

import { 
  BASE_URL, 
  API_TRANSFER, 
  API_TRANSFER_APPROVAL
} from './api'

export default class TicketQRCode extends React.Component {
  static navigationOptions = {
    title: `QR CODE`,
  };

  DEFAULT_POLL_TRY_LIMIT = 10;
  state = {
    pollTry: 0,
    pollTryLimit: this.DEFAULT_POLL_TRY_LIMIT
  }
  qrCode = undefined;
  transferInfo = {
    transferId: undefined,
    ticketId: undefined,
    idFrom: undefined,
    nameFrom: undefined,
    transferIdTo: undefined,
    transferNameTo: undefined,
    transferResult: undefined,
  }
  pollInfo = {
    pollTry: 0,
    pollTryLimit: this.DEFAULT_POLL_TRY_LIMIT
  }
  isPushedAllowance = false;
  allowPolling = false;

  /*** DATA FUNCTIONS ***/
  // Local data
  getQrCode = () => {
    const { transferId, ticketId, idFrom } = this.transferInfo;
    return `transferId=${transferId}&ticketId=${ticketId}&idFrom=${idFrom}`;
  }
  formatTransferData (data) {
    return {
      transferId: data.id,
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
  getNewTransferInfo = async (ticketId, userId) => {
    try {
      const URL = BASE_URL + API_TRANSFER;
      console.log('URL', URL);
      return await axios.post(URL, {ticketId, userId})
          .then(res=>res.data)
          .then(json=> Array.from(json.rows).map(this.formatTransferData)[0])
          .catch(err=>console.log(err));
    } catch (err) {
      console.error(err);
    }
  }
  approvalTransfer = async (allowance, alert) => {
    if (this.isPushedAllowance) return;
    this.isPushedAllowance = true;
    try {
      const transferId = this.transferInfo.transferId;
      const URL = BASE_URL + API_TRANSFER_APPROVAL;
      console.log('URL', URL);
      axios.put(URL, {id: transferId, allowance})
        .then(res=>res.data)
        .then( json => {
          if ( typeof alert === 'function' )
            alert();
          console.log(json);
        })
    } catch (err) {
      console.error(err);
    }
  }

  // Polling
  // TODO: extract
  setGetTransferInfoPolling() {
    this.setPollDefaultValue();
    this.runPolling(
      undefined, 
      this.approvalAlert, 
      this.watingTimeoverAlert
    );
  }
  setPollDefaultValue = () => {
    this.allowPolling = true;
    this.setState({
      pollTry: 0,
      pollTryLimit: this.DEFAULT_POLL_TRY_LIMIT
    });
  }
  setPollStopValue = () => {
    this.allowPolling = false;
  }
  getPollForFindReceiverInfo = () => {
    const id = this.transferInfo.transferId;
    const URL = BASE_URL + API_TRANSFER + '/' + id;
    console.log('URL', URL);
    return function *poll () {
      while(true) {
        try {
          yield axios(URL)
            .then(res => res.data)
            .catch(err=> console.log(err));
        } catch (err) {
          console.error('transferDetail', err);
        }
      }
    }
  }
  runPolling = (generator, successFn, waitngFn) => {
    if(!generator) {
      generator = this.getPollForFindReceiverInfo()();
    }

    let p = generator.next();
    p.value.then( (data) => {
      if( !this.allowPolling ) return;
      data = Array.from(data.rows).map(this.formatTransferData)[0];
      console.log('data.idTo', data.idTo);
      let pollTry = this.state.pollTry;
      let pollTryLimit = this.state.pollTryLimit;
      if( pollTryLimit <= 0 ) {
        if( typeof waitngFn === 'function' )
          waitngFn('Timeout');
        return;
      }

      // check there is apply to transfer by idTo value
      if( !data || data.idTo === null ) {
        setTimeout( () => {
        pollTry += 1;
        pollTryLimit -= 1;
        this.setState({pollTry, pollTryLimit});
        this.runPolling(generator, successFn, waitngFn);
      }, 1000);
      } else {
        console.log('checked apply',data);
        if( typeof successFn === 'function' )
          successFn(`To ${data.idTo}/${data.nameTo}`);
      }
    });
  }

  /*** UI Handlers ***/
  watingTimeoverAlert = () => {
    Alert.alert(
      'Wating Time Over',
      '',
      [
        {
          text: `Keep Waiting`, 
          onPress: () => this.setGetTransferInfoPolling()
        },
        {
          text: `Cancel`, 
          onPress: () => {
            this.approvalTransfer(false);
            this.props.navigation.goBack();
          }
        },
      ],
      { cancelable: false}
    );
  }
  approvalAlert = (text) => {
    Alert.alert(
      'Appoval to transfer?',
      text,
      [
        {
          text: `OK`, 
          onPress: () => this.handleApprovalTransfer(true)
        },
        {
          text: `Cancel`, 
          onPress: () => this.handleApprovalTransfer(false)
        },
      ],
      { cancelable: false}
    );
  }
  handleApprovalTransfer = (allowance) => {
    this.approvalTransfer(allowance, this.transferEndAlert(allowance));
  }  
  transferEndAlert = (allowance) => {
    if(typeof data === 'Object')
      data = JSON.stringify(data);
    Alert.alert(
      'Transfer',
      allowance ? 'Done' : 'Canceled',
      [
        {
          text: `OK`, 
          onPress: () => {
            this.props.navigation.goBack();
            if( allowance )
              this.props.navigation.state.params.deleteTicketOnList(this.transferInfo.ticketId);
          }
        },
      ],
      { cancelable: false}
    );
  }

  // React LifeCycle
  async componentDidMount() {
    const { getParam } = this.props.navigation;
    const ticketInfo = JSON.parse(getParam('ticketInfo', "{}"));
    const { ticketId, userId } = ticketInfo;
    const result = await this.getNewTransferInfo(ticketId, userId);
    const { transferId, idFrom, nameFrom } = result;

    this.transferInfo.transferId = transferId;
    this.transferInfo.ticketId = ticketId;
    this.transferInfo.idFrom = idFrom;
    this.transferInfo.nameFrom = nameFrom;

    this.qrCode = this.getQrCode();

    this.setGetTransferInfoPolling();
  }
  componentWillUnmount () {
    console.log('componentWillUnmount');
    this.setPollStopValue();
    this.approvalTransfer(false, undefined);
  }

  render() {
    const { pollTryLimit } = this.state;
    const qrCode = this.qrCode;
    const { ticketId }  = this.transferInfo;
    return (
      <View style={styles.container}>
        <Text>ticketId: {ticketId} </Text>
        { qrCode && (
          <View>
            <QRCode
              value={qrCode}
              size={200}
              bgColor='black'
              fgColor='white'
            />
          </View>
        )}
        <Text>Wating {pollTryLimit}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
})