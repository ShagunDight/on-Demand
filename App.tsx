import messaging from '@react-native-firebase/messaging';
import React, { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import { ActivityIndicator, View, SafeAreaView, StyleSheet, Alert, PermissionsAndroid, Platform, Text } from 'react-native';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo'; // Import NetInfo

const BACKEND_API_URL = "https://dev.dightinfotech.com/ondemand/api/save-fcm-token";

const App = () => {
    const [deviceToken, setDeviceToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isConnected, setIsConnected] = useState(true);

    async function requestNotificationPermission() {
          try {
            if (Platform.OS === 'android') {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                {
                  title: 'Notification Permission',
                  message: 'This app would like to send you notifications.',
                  buttonNeutral: 'Ask Me Later',
                  buttonNegative: 'Cancel',
                  buttonPositive: 'OK',
                }
              );
              if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Notification permission granted');
              } else {
                console.log('Notification permission denied');
              }
            }
          } catch (err) {
            console.warn(err);
          }
        }

    useEffect(() => {
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (!state.isConnected) {
                Alert.alert('No Internet Connection', 'Please check your internet settings.');
            }
        });

        const requestUserPermission = async () => {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Notification permission granted.');
                getFCMToken();
            } else {
                console.log('Notification permission denied. Requesting...');

            }
        };

        const getFCMToken = async () => {
            const token = await messaging().getToken();
            console.log('FCM Token:', token);
            setDeviceToken(token);
        };
        requestUserPermission();

        return () => {
            unsubscribeNetInfo(); // Cleanup the listener on unmount
        };
    }, []);

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data && data.user) {
                sendTokenToBackend(data.user);
                console.log('User Data from WebView:', data.user);
            }
        } catch (error) {
            console.error('Error parsing message from WebView:', error);
        }
    };

    const sendTokenToBackend = async (userData) => {
        try {
            if (deviceToken && userData.id !== "Login") {
                const response = await axios.post(BACKEND_API_URL, {
                    user_id: userData.id,
                    token: deviceToken,
                });
                await requestNotificationPermission();
                console.log('Token successfully sent to backend', response.data);
            }
        } catch (error) {
            console.log('Error sending token to backend', error.response?.data || error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {loading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
            {isConnected ? (
                <WebView
                    source={{ uri: 'https://dev.dightinfotech.com/ondemand' }}
                    onLoadStart={() => setLoading(true)}
                    onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
                    onLoadEnd={() => setLoading(false)}
                    style={styles.webview}
                    onMessage={handleMessage}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#0000ff" />
                        </View>
                    )}
                    onHttpError={() => {
                        setLoading(false);
                        Alert.alert('HTTP Error', 'There was an error loading the page.');
                    }}
                />
            ) : (
                <View style={styles.offlineContainer}>
                    <Text style={styles.offlineText}>No Internet Connection</Text>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loaderContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    offlineContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    offlineText: {
        fontSize: 18,
        color: '#000',
        marginBottom: 10,
    },
});

export default App;