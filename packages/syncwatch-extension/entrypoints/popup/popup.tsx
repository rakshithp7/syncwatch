import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import '@/css/theme.css';
import '@gravity-ui/uikit/styles/styles.css';

import { RuntimeMessage, RuntimeMessageName } from '@/types/types';
import {
  Button,
  Flex,
  Link,
  Switch,
  Text,
  TextInput,
  ThemeProvider,
  spacing,
} from '@gravity-ui/uikit';
import type { Share, User, UserList } from 'syncwatch-types';

const typesOfData = [
  RuntimeMessageName.popupGetUser,
  RuntimeMessageName.popupGetStatus,
  RuntimeMessageName.popupGetUsersList,
  RuntimeMessageName.popupGetShare,
] as const;

function getData(type: (typeof typesOfData)[number]) {
  browser.runtime.sendMessage({
    from: type,
  });
}

function getFaviconFromUrl(url: string) {
  return `${new URL('favicon.ico', new URL(url).origin)}`;
}

function Popup() {
  const [connectButtonValue, setConnectButtonValue] = useState(
    browser.i18n.getMessage('popup_button_disconnect'),
  );
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [share, setShare] = useState<Share | undefined>(undefined);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [users, setUsers] = useState<UserList>([]);
  const [autoFollow, setAutoFollow] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const isConnected = connectButtonValue === browser.i18n.getMessage('popup_button_disconnect');

  function onClickShare() {
    browser.runtime.sendMessage({ from: RuntimeMessageName.popupShare });
  }

  function onClickVideoLink(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
    if (share) {
      browser.runtime.sendMessage({
        from: RuntimeMessageName.popupOpenVideo,
        data: { url: share.url },
      });
    }
    event.preventDefault();
  }

  function onClickConnect() {
    if (isConnected) {
      browser.runtime.sendMessage({ from: RuntimeMessageName.popupDisconnect });
    } else {
      browser.runtime.sendMessage({ from: RuntimeMessageName.popupJoin, data: user });
      setConnectButtonValue(`${browser.i18n.getMessage('popup_button_connecting')}...`);
      setConnectionError('');
    }
  }

  function onRuntimeMessage(msg: RuntimeMessage) {
    if (msg.from === RuntimeMessageName.backgroundStatus) {
      if (msg.status === 'connect') {
        setConnectButtonValue(browser.i18n.getMessage('popup_button_disconnect'));
      } else {
        setConnectButtonValue(browser.i18n.getMessage('popup_button_connect'));
        setUsers([]);
        setShare(undefined);
      }
      setConnectionStatus(browser.i18n.getMessage(`socket_event_${msg.status}`));
    }
    if (msg.from === RuntimeMessageName.backgroundShare) {
      if (msg.data) {
        setShare(msg.data);
      }
    }
    if (msg.from === RuntimeMessageName.backgroundSendUsersList) {
      setUsers(msg.list);
    }
    if (msg.from === RuntimeMessageName.backgroundSendError) {
      setConnectionError(browser.i18n.getMessage(msg.error));
    }
    if (msg.from === RuntimeMessageName.backgroundSendUser && msg.data) {
      setUser(msg.data);
    }
  }

  useEffect(() => {
    browser.runtime.onMessage.addListener(onRuntimeMessage);

    for (const val of typesOfData) getData(val);

    browser.storage.sync.get(['autoFollow', 'broadcastMode'], (result) => {
      if (result.autoFollow !== undefined) setAutoFollow(result.autoFollow);
      if (result.broadcastMode !== undefined) setBroadcastMode(result.broadcastMode);
    });

    return () => {
      browser.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, []);

  const handleAutoFollowChange = (checked: boolean) => {
    if (checked) {
      setShowSecurityWarning(true);
    } else {
      setAutoFollow(false);
      browser.storage.sync.set({ autoFollow: false });
    }
  };

  const handleBroadcastModeChange = (checked: boolean) => {
    setBroadcastMode(checked);
    browser.storage.sync.set({ broadcastMode: checked });
  };

  if (showSecurityWarning) {
    return (
      <Flex direction={'column'} width={'240px'} gap={'4'} data-testId="screenshot">
        <Flex justifyContent={'center'}>
          <Text variant="header-2">Security Warning</Text>
        </Flex>
        <Text variant="body-1">
          Enabling "Auto-follow" allows the room to control your browser navigation.
          <br />
          <br />
          Only enable this in trusted rooms. Malicious users could redirect you to phishing or
          malware sites.
        </Text>
        <Flex gap={2} justifyContent="space-between">
          <Button width="max" view="outlined" onClick={() => setShowSecurityWarning(false)}>
            Disagree
          </Button>
          <Button
            width="max"
            view="action"
            onClick={() => {
              setShowSecurityWarning(false);
              setAutoFollow(true);
              browser.storage.sync.set({ autoFollow: true });
            }}
          >
            Agree
          </Button>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex direction={'column'} width={'240px'} gap={'2'} data-testId="screenshot">
      <Flex justifyContent={'center'}>
        <Text variant="header-2">syncwatch</Text>
      </Flex>
      <TextInput
        name="name"
        defaultValue={user?.name}
        placeholder={browser.i18n.getMessage('popup_input_name')}
        onChange={(ev) => user && setUser({ ...user, name: ev.target.value })}
        id="input-name"
      />
      <TextInput
        name="room"
        defaultValue={user?.room}
        placeholder={browser.i18n.getMessage('popup_input_room')}
        onChange={(ev) => user && setUser({ ...user, room: ev.target.value })}
        id="input-room"
      />
      {connectionError && <Text color="danger-heavy">{connectionError}</Text>}
      <Flex direction="column" gap={2}>
        <Flex alignItems="center" gap={2} justifyContent="space-between">
          <Text variant="body-1">Auto-follow shared URLs</Text>
          <Switch checked={autoFollow} onUpdate={handleAutoFollowChange} />
        </Flex>
        <Flex alignItems="center" gap={2} justifyContent="space-between">
          <Text variant="body-1">Broadcast my URL changes</Text>
          <Switch checked={broadcastMode} onUpdate={handleBroadcastModeChange} />
        </Flex>
      </Flex>
      {isConnected && (
        <>
          {
            <Button name="share" onClick={onClickShare}>
              {browser.i18n.getMessage('popup_button_share').toLocaleLowerCase()}
            </Button>
          }
          {share && (
            <Link href={share.url} target="_blank" onClick={onClickVideoLink} data-testId="shared">
              <Flex alignItems={'center'} gap={2}>
                <img src={getFaviconFromUrl(share.url)} width="16px" height="16px" />
                <Text variant="body-2" ellipsisLines={2}>
                  {share.title}
                </Text>
              </Flex>
            </Link>
          )}
          {users.length > 0 && (
            <Flex direction="column" gap="1">
              <Text variant="body-2">
                {`${browser.i18n.getMessage('popup_usersInRoom')}:`.toLocaleLowerCase()}
              </Text>
              <Flex className={spacing({ ml: 4 })} direction="column" data-testId="users-list">
                {users.map((user) => (
                  <Flex key={user}>
                    <Text>{user}</Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          )}
        </>
      )}
      <Text variant="body-2" data-testId="status">
        {`${browser.i18n.getMessage('popup_status')}: ${connectionStatus}`.toLocaleLowerCase()}
      </Text>
      <Button width={'max'} view="action" name="connect" onClick={onClickConnect}>
        {connectButtonValue.toLocaleLowerCase()}
      </Button>
    </Flex>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Popup />
    </ThemeProvider>
  </React.StrictMode>,
);
