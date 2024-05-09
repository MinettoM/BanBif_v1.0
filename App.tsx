import React, {useState, useEffect} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  Switch,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import MCReactModule from 'react-native-marketingcloudsdk';
import Toast from 'react-native-root-toast';

const App = () => {
  const [dni, setDNI] = useState('');
  const [userImage, setUserImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aspectRatio, setAspectRatio] = useState(1); // Relación de aspecto predeterminada

  const fetchToken = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://mc2nqjmlyhcbf2cz3s0c61126mn8.auth.marketingcloudapis.com/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: 'fdue0vo57irwpkpbfenumbbu',
          client_secret: '7xpT2X3Cxbz7Xtc140x0gEJP'
        })
      });
      const data = await response.json();
      return data.access_token;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Error fetching access token: ' + err.message);
      } else {
        setError('Error fetching access token: Unexpected error');
      }
      setLoading(false);
    }
  };
  
  const fetchUserData = async (accessToken: any, dni: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://mc2nqjmlyhcbf2cz3s0c61126mn8.rest.marketingcloudapis.com/data/v1/customobjectdata/key/95C95485-44EC-499B-AF59-1D6209097470/rowset?$filter=DNI eq '${dni}'`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data && data.items && data.items.length > 0) {
        setUserImage(data.items[0].values.linkurl);
      } else {
        setUserImage('');
        setError('No user data found for this DNI');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError('Error fetching user data: ' + err.message);
      } else {
        setError('Error fetching user data: Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    const token = await fetchToken();
    if (token && dni) {
      fetchUserData(token, dni);  // Asegúrate de pasar 'email' aquí
    } else {
      setError('Please enter a valid DNI or token could not be fetched');
      setLoading(false);
    }
  };

  const handleImageLoaded = (event: { nativeEvent: { source: { width: any; height: any; }; }; }) => {
    const { width, height } = event.nativeEvent.source;
    setAspectRatio(width / height);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}>
        <StatusBar barStyle={'dark-content'} />
        <Header/>
        <Section title="User Image Search">
          <TextInput
            style={[styles.input, { marginTop: 20 }]}
            onChangeText={setDNI}
            value={dni}
            placeholder="Typer the DNI to search"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleSearch}>
            <Text style={styles.buttonText}>Search Image</Text>
          </TouchableOpacity>
          {loading && <Text>Loading...</Text>}
          {error ? <Text>{error}</Text> : null}
          {userImage && (
          <TouchableOpacity onPress={openURL}>
            <Image
              source={{ uri: userImage }}
              style={{ width: '100%', height: undefined, aspectRatio: aspectRatio, marginTop: 10 }}
              resizeMode="contain"
              onLoad={handleImageLoaded}
              />
          </TouchableOpacity>
          )}
        </Section>
        <Section title="Push">
          <Push />
        </Section>
        <Section title="Registration">
          <ContactKey />
          <Tags />
          <Attributes />
        </Section>
        <Section title="Logging">
          <Logging />
        </Section>
        <Section title="Runtime Feature Toggle">
          <FeatureToggle />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const Push = () => {
  const [isPushEnabled, setPushEnabled] = useState(false);
  const [pushToken, setPushToken] = useState('');

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATION,
        );
      }
    } catch (err) {
      console.warn('requestNotificationPermission error: ', err);
    }
  };

  const updatePushData = async () => {
    let enabled = await MCReactModule.isPushEnabled();
    let systemToken = await MCReactModule.getSystemToken();
    setPushEnabled(enabled);
    setPushToken(systemToken || '');
  };

  const handleSystemTokenPress = async () => {
    let systemToken = await MCReactModule.getSystemToken();
    setPushToken(systemToken || '');
    Toast.show('System Token: ' + systemToken);
  };

  const togglePush = async () => {
    if (isPushEnabled) {
      MCReactModule.disablePush();
      Toast.show('Push Disabled');
      setPushEnabled(false);
    } else {
      MCReactModule.enablePush();
      Toast.show('Push Enabled');
      setPushEnabled(true);
    }
    let systemToken = await MCReactModule.getSystemToken();
    setPushToken(systemToken || '');
  };

  useEffect(() => {
    updatePushData();
    requestNotificationPermission();
  }, []);

  return (
    <View>
      <Text selectable={true} style={styles.label}>
        Push Token: {pushToken}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleSystemTokenPress}>
        <Text style={styles.buttonText}>Get System Token</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={togglePush}>
        <Text style={styles.buttonText}>
          {isPushEnabled ? 'Disable Push' : 'Enable Push'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const Tags = () => {
  const [inputText, setInputText] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    updateTags();
  }, []);

  const updateTags = async (msg?: string) => {
    return Promise.resolve()
      .then(MCReactModule.getTags)
      .then(val => {
        setTags(val || []);
        msg && Toast.show(msg);
        return val;
      });
  };

  const removeTag = async () => {
    MCReactModule.removeTag(inputText);
    setInputText('');
    updateTags('Tag removed');
  };

  const handleTags = async () => {
    MCReactModule.addTag(inputText);
    setInputText('');
    updateTags('Tag added');
  };

  return (
    <View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Tags: {tags.join(', ')}</Text>
      </View>
      <TextInput
        style={styles.input}
        onChangeText={setInputText}
        value={inputText}
        placeholder="Enter tags"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleTags}>
        <Text style={styles.buttonText}>Add Tag</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => updateTags('Tags updated')}>
        <Text style={styles.buttonText}>Get Tags</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={removeTag}>
        <Text style={styles.buttonText}>Remove Tag</Text>
      </TouchableOpacity>
    </View>
  );
};

const ContactKey = () => {
  const [inputText, setInputText] = useState('');
  const [contactKey, setContactKey] = useState('');

  useEffect(() => {
    updateContactKey();
  }, []);

  const updateContactKey = async (msg?: string) => {
    return Promise.resolve()
      .then(MCReactModule.getContactKey)
      .then(val => {
        setContactKey(val || '');
        msg && Toast.show(msg);
        return val;
      });
  };

  const handleContactKey = async () => {
    if (inputText === '') {
      Toast.show('Please enter valid contact key');
      return;
    }
    MCReactModule.setContactKey(inputText);
    setInputText('');
    updateContactKey('ContactKey is set');
  };

  return (
    <View>
      <View style={styles.textContainer}>
        <Text selectable={true} style={styles.label}>
          Contact Key: {contactKey}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        onChangeText={setInputText}
        value={inputText}
        placeholder="Enter contact key"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleContactKey}>
        <Text style={styles.buttonText}>Set Contact Key</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => updateContactKey('Contact Key updated')}>
        <Text style={styles.buttonText}>Get Contact Key</Text>
      </TouchableOpacity>
    </View>
  );
};

const Attributes = () => {
  const [attributes, setAttributes] = useState({});

  useEffect(() => {
    updateAttributes();
  }, []);

  const updateAttributes = async (msg?: string) => {
    return Promise.resolve()
      .then(MCReactModule.getAttributes)
      .then(val => {
        setAttributes(val || {});
        msg && Toast.show(msg);
        return val;
      });
  };

  const handleAddKeyValue = async () => {
    const newKey = keyInput.trim();
    const newValue = valueInput.trim();

    if (newKey && newValue && newKey !== '' && newValue !== '') {
      MCReactModule.setAttribute(newKey, newValue);
      setKeyInput('');
      setValueInput('');
      updateAttributes('Attribute added');
    } else {
      Toast.show('Please enter valid key and value');
    }
  };

  const handleClearAttribute = async () => {
    const newKey = keyInput.trim();
    if (keyInput === '') {
      Toast.show('Please enter key to remove');
      return;
    }

    if (newKey && newKey !== '') {
      MCReactModule.clearAttribute(newKey);
      setKeyInput('');
      setValueInput('');
      updateAttributes('Attribute removed with key: ' + newKey);
    } else {
      Toast.show('Please enter key to remove');
    }
  };

  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');

  return (
    <View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>
          attributes: {JSON.stringify(attributes)}
        </Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter Attribute Key"
        value={keyInput}
        onChangeText={setKeyInput}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input]}
        placeholder="Enter Attribute Value"
        value={valueInput}
        onChangeText={setValueInput}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleAddKeyValue}>
        <Text style={styles.buttonText}>Add Attribute</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleClearAttribute}>
        <Text style={styles.buttonText}>Clear Attribute with Key</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => updateAttributes('Attributes updated')}>
        <Text style={styles.buttonText}>Get Attributes</Text>
      </TouchableOpacity>
    </View>
  );
};

const FeatureToggle = () => {
  const [isAnalyticsEnabled, setAnalyticsEnabledState] = useState(false);
  const [isPiAnalyticsEnabled, setPiAnalyticsEnabledState] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setAnalyticsEnabledState(await MCReactModule.isAnalyticsEnabled());
      setPiAnalyticsEnabledState(await MCReactModule.isPiAnalyticsEnabled());
    };

    fetchData();
  }, []);

  const toggleFeature = async (
    featureName: string,
    currentValue: boolean,
    setterFunction: React.Dispatch<React.SetStateAction<boolean>>,
    toggleFunction: (enabled: boolean) => void,
  ) => {
    toggleFunction(!currentValue);
    setterFunction(!currentValue);
    Toast.show(`${featureName} is ${!currentValue ? 'Enabled' : 'Disabled'}`);
  };

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Analytics</Text>
        <Switch
          onValueChange={() =>
            toggleFeature(
              'Analytics',
              isAnalyticsEnabled,
              setAnalyticsEnabledState,
              MCReactModule.setAnalyticsEnabled,
            )
          }
          value={isAnalyticsEnabled}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>PI Analytics</Text>
        <Switch
          onValueChange={() =>
            toggleFeature(
              'PI Analytics',
              isPiAnalyticsEnabled,
              setPiAnalyticsEnabledState,
              MCReactModule.setPiAnalyticsEnabled,
            )
          }
          value={isPiAnalyticsEnabled}
        />
      </View>
    </View>
  );
};

const openURL = () => {
  const url = 'https://www.banbif.com.pe/Personas';
  Linking.openURL(url).catch(err => console.error('An error occurred', err));
};

const Logging = () => {
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    MCReactModule.getDeviceId().then(val => {
      setDeviceId(val || '');
    });
  }, []);

  const handleEnableLogging = async () => {
    MCReactModule.enableLogging();
    Toast.show('Logging Enabled');
  };

  const handleDisableLogging = async () => {
    await MCReactModule.disableLogging();
    Toast.show('Logging Disabled ');
  };

  const handleSDKState = async () => {
    MCReactModule.logSdkState();
    Alert.alert('Please check the platform logs for SDK State.');
  };

  const handleDeviceId = async () => {
    let deviceIdentifier = await MCReactModule.getDeviceId();
    setDeviceId(deviceIdentifier || '');
    Toast.show('Device Id: ' + deviceIdentifier, {
      duration: Toast.durations.LONG,
    });
  };

  return (
    <View>
      <Text selectable={true} style={styles.label}>
        DeviceId: {deviceId}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleDeviceId}>
        <Text style={styles.buttonText}>Get Device Id</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleEnableLogging}>
        <Text style={styles.buttonText}>Enable Logging</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleDisableLogging}>
        <Text style={styles.buttonText}>Disable Logging</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleSDKState}>
        <Text style={styles.buttonText}>Log SDK State</Text>
      </TouchableOpacity>
    </View>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({title, children}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const Header = () => {
  return (
    <View style={styles.headerContainer}>
        <Image
          source={{ uri: 'https://getonbrd-prod.s3.amazonaws.com/uploads/users/logo/7374/logo.png' }}
          style={[styles.headerImage, { width: 150, height: 150 }]}
          resizeMode="contain"
        />
    </View>
  );
};


const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    alignItems: 'center',
  },
  sectionContent: {
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#3F51B5',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#1A89CE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerImage: {
    height: 100,
    width: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  toggleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
