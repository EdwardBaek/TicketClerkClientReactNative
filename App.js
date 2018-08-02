import { createStackNavigator } from 'react-navigation';

import TicketMain from './src/TicketMain';
import TicketList from './src/TicketList';
import TicketQRCode from './src/TicketQRCode';
import TicketQRCodeReader from './src/TicketQRCodeReader';

export default App = createStackNavigator(
  {
    TicketMain: { screen: TicketMain },
    TicketList: { screen: TicketList },
    TicketQRCode: { screen: TicketQRCode },
    TicketQRCodeReader: { screen: TicketQRCodeReader },
  },
  {
    initialRouteName: 'TicketMain'
  }
);