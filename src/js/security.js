function cSecurityManagerApp(pOwner) {
    var self = new cSecurityManager({
        mb: {
            settings: {}
        }
    }),
        cvIsEnabled = false,
        cvPortalAccessProtection = 'PortalAccessProtection',
        cvSecurityWindow, cvSecurityDiv, cvBackBar,
        cvBackBtn, cvSubmitBtn, cvLoginInput, cvPasswordInput,
        cvErrorMessageLabel, cvTabsControlBar, cvScroll,
        cvSecurityForm, cvRemoteConfig;

    function addFocusInput() {
        for (var i = 0; i < arguments.length; i++)
            arguments[i].onclick = function() {
                this.focus();
            };
        console.log(1)
    }

    function initScroll() {
        var vScrollElem = _$('#scrollControler');
        if (vScrollElem && !vScrollElem.instance)
            cvScroll = new csc(vScrollElem, false, true);

        cvScroll.lockedClick = $ua.iP() || $ua.chrome();
        cvScroll.refresh();
        _$('.scrollBar', cvSecurityWindow).parentNode.style.top = TOOL_BAR_HEIGHT + 'px';

        self.resizeScroll();
    }

    self.resizeScroll = function(pMessage) {
        while (cvScroll.owner.offsetHeight < cvSecurityDiv.offsetHeight + ($ua.iP() ? 200 + ($ua.iPad() ? 400 : 0) : 200)) {
            cvScroll.refresh();

            if (pMessage)
                cvScroll.setPosition([0, cvLoginInput.getBoundingClientRect().bottom]);
        }
    };

    function close() {
        cvSecurityWindow.parentNode.style.height = window.innerHeight - TOOL_BAR_HEIGHT + 'px';
        cvErrorMessageLabel.innerHTML = '';
        cvLoginInput.value = '';
        cvPasswordInput.value = '';
        cvLoginInput.placeholder = pOwner.loc('login', 'security');
        cvPasswordInput.placeholder = pOwner.loc('password', 'security');
        $dom.hide(cvSecurityWindow);
        $dom.show(cvTabsControlBar);
        $dom.show(_$('#cflow '));
        toggleSignIn();
        pOwner.initCases();
    }

    function toggleSignIn() {
        if (!$dom.showed(cvSecurityWindow))
            appConfig.securityAccessAllowed ? $dom.hide(pOwner.cvSignInBtn) : $dom.show(pOwner.cvSignInBtn);
    }

    function checkIsInputEmpty() {
        for (var i = 0; i < arguments.length; i++)
            if (!arguments[i].value) {
                cvErrorMessageLabel.innerHTML = (arguments[i] == cvLoginInput) ?
                    cvErrorMessageLabel.innerHTML = pOwner.loc('noLogin', 'security') :
                    pOwner.loc('noPassword', 'security');
                $dom.show(cvErrorMessageLabel);
                self.resizeScroll();
                shake(cvSecurityForm);
                return true;
            }
        return false;
    }

    function shake(pElem) {
        if (!pElem.classList.contains('shake'))
            pElem.classList.add('shake');
        else {
            pElem.style.animationName = 'none';
            pElem.style.webkitAnimationName = 'none';

            setTimeout(function() {
                pElem.style.animationName = 'shake';
                pElem.style.webkitAnimationName = 'shake';
            }, 0);
        }
    }

    self.load = function() {
        if (pOwner.content.parentNode.contains(cvSecurityWindow))
            return self.init();

        _$get('main/tmpl/protection.htm', function(data) {
            pOwner.content.parentNode.insertAdjacentHTML('beforeEnd', data);

            cvSecurityWindow = _$('#protectionWrapper');
            cvSecurityDiv = _$('.protectionWindow', cvSecurityWindow);
            cvBackBar = _$('.protectionBackBar', cvSecurityWindow);
            cvBackBtn = _$('.button_back', cvBackBar);
            cvSecurityForm = _$('.protectionForm', cvSecurityWindow);
            cvSubmitBtn = _$('.protectionSubmit', cvSecurityDiv);
            cvLoginInput = _$('input[type=text]', cvSecurityDiv);
            cvPasswordInput = _$('input[type=password]', cvSecurityDiv);
            cvErrorMessageLabel = _$('.protectionErrorMessage', cvSecurityDiv);
            cvMessageLabel = _$('.protectionMessage', cvSecurityDiv);
            cvTabsControlBar = _$('#tabsControl');

            pOwner.cvSignInBtn.firstChild.innerHTML = pOwner.loc('signIn', 'security');

            pOwner.cvSignInBtn.onclick = function() {
                self.show(undefined);
            };

            self.init();
        });
    };

    function getFromPortalInternal(pRequestName, pRequestParams, pCallback) {
        self.getFromPortal($soap.createRequest("urn:Webservices" + cvPortalAccessProtection, pRequestName, pRequestParams), pRequestName, pCallback);
    }

    function remoteAuthentication(pOption) {
        var vXHR = new XMLHttpRequest(),
            vLogin = lStorage.getItem('lastValidLogin') || cvLoginInput.value,
            vPass = lStorage.getItem('lastValidPassword') || cvPasswordInput.value,
            vRequestData;

        vRequestData = pOption.loginVar + '=' + vLogin + '&' + pOption.passVar + '=';

        if (pOption.passEncode == 'MD5')
            vRequestData += $crypt.hex_md5(vPass);
        else if (pOption.passEncode == 'SHA1')
            vRequestData += $crypt.sha1(vPass, false);
        else
            vRequestData += vPass;

        vXHR.onerror = function() {
            $log.info('remoteAuthentication' + vXHR.status);
        };
        vXHR.open(pOption.method, pOption.method == 'POST' ? pOption.url : pOption.url + '?' + vRequestData, false);

        if (pOption.method == 'POST') {
            vXHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            vXHR.send(vRequestData);
        } else
            vXHR.send();

        return +pOption.rot47 ? vXHR.responseText == $crypt.rot47(pOption.positiveResponce) :
            vXHR.responseText == pOption.positiveResponce;
    }

    self.init = function() {
        if (pOwner.isConnected()) {
            //check SECURITY isEnable
            getFromPortalInternal('checkExistanceByApp', {
                    "app_id": $soap.createField("string", APP_ID)
                },
                function(pData) {
                    cvIsEnabled = +$soap.getFieldValue(pData, 'exists') ? true : false;
                    if (!cvIsEnabled) {
                        appConfig.securityAccessAllowed = true;
                        return $dom.hide(pOwner.cvSignInBtn);
                    } else
                        appConfig.securityAccessAllowed = false;

                    lStorage.setItem('message', $soap.getFieldValue(pData, 'message'));
                    lStorage.setItem('profile_id', $soap.getFieldValue(pData, 'profile_id'));

                    //remote Authentication
                    if ($soap.getFieldValue(pData, 'auth_type') == 'remote') {
                        cvRemoteConfig = {
                            url: 'http://' + $soap.getFieldValue(pData.config, 'url'),
                            method: $soap.getFieldValue(pData.config, 'method'),
                            rot47: $soap.getFieldValue(pData.config, 'rot47'),
                            loginVar: $soap.getFieldValue(pData.config, 'user_variable'),
                            passVar: $soap.getFieldValue(pData.config, 'password_variable'),
                            passEncode: $soap.getFieldValue(pData.config, 'password_encode'),
                            positiveResponce: $soap.getFieldValue(pData.config, 'positive_response')
                        };
                    }

                    //background check if ACCESS allowed
                    if (lStorage.getItem('lastValidLogin') && lStorage.getItem('lastValidPassword')) {
                        if (cvRemoteConfig) {
                            if (remoteAuthentication(cvRemoteConfig))
                                appConfig.securityAccessAllowed = true;

                            toggleSignIn();
                        } else
                            getFromPortalInternal('checkPassword', {
                                    "profile_id": $soap.createField("string", lStorage.getItem('profile_id')),
                                    "login": $soap.createField("string", lStorage.getItem('lastValidLogin')),
                                    "password": $soap.createField("string", lStorage.getItem('lastValidPassword'))
                                },
                                function(pData) {
                                    appConfig.securityAccessAllowed = +$soap.getFieldValue(pData, 'exists') ? true : false;
                                    toggleSignIn();
                                });
                    } else
                        toggleSignIn();
                }
            );
        } else {
            appConfig.securityAccessAllowed = false;
            pOwner.showAlert(pOwner.loc('connectionProblem', 'errors'), pOwner.loc('securityStatus', 'errors'), 'OK');
            toggleSignIn();
        }
    };

    self.show = function(pIndex, pPrlBtn) {
        _$('#wrapper').style.height = screen.availHeight + 'px';
        $dom.show(cvSecurityWindow);
        $dom.hide(cvTabsControlBar);
        $dom.hide(pOwner.cvSignInBtn);
        cvSubmitBtn.innerHTML = pOwner.loc('submit', 'security');
        cvBackBtn.innerHTML = pOwner.loc('back', 'security');
        cvLoginInput.placeholder = pOwner.loc('login', 'security');
        cvPasswordInput.placeholder = pOwner.loc('password', 'security');
        cvMessageLabel.innerHTML = $crypt.b64decode(lStorage.getItem('message'));
        addFocusInput(cvLoginInput, cvPasswordInput);
        $dom.hide(_$('#cflow '));

        initScroll();

        cvBackBtn.onclick = close;

        cvSubmitBtn.onclick = function() {
            submitForm(pIndex, pPrlBtn);
        };
    };

    function submitAction(pIndex, pPrlBtn) {
        appConfig.securityAccessAllowed = true;
        lStorage.setItem('securityAccessAllowed', true);
        lStorage.setItem('lastValidLogin', cvLoginInput.value);
        lStorage.setItem('lastValidPassword', cvPasswordInput.value);

        if (pPrlBtn) {
            pPrlBtn.suspended = !pPrlBtn.suspended;
            pPrlBtn.innerText = (pPrlBtn.suspended ? 'Download' : 'Stop');
            pOwner.mngDownloader[pPrlBtn.suspended ? 'stop' : 'start'](pPrlBtn.eMagName, !pPrlBtn.suspended);
        } else if (!isNaN(pIndex))
            pOwner.coverFlowAction(pIndex);

        $dom.hide(pOwner.cvSignInBtn);
        close();
    }

    function submitForm(pIndex, pPrlBtn) {
        $dom.hide(cvErrorMessageLabel);

        if (checkIsInputEmpty(cvLoginInput, cvPasswordInput))
            return;

        if (!pOwner.isConnected()) {
            pOwner.showAlert('Connection problem!', 'Can\'t check security status, please connect to the Internet', 'OK');
            return close();
        } else {
            cvErrorMessageLabel.innerHTML = pOwner.loc('checkPleaseWait', 'security');
            $dom.show(cvErrorMessageLabel);
            self.resizeScroll();

            //remote authentication
            if (cvRemoteConfig) {
                if (remoteAuthentication(cvRemoteConfig))
                    submitAction(pIndex, pPrlBtn);
                else {
                    cvErrorMessageLabel.innerHTML = pOwner.loc('checkFailed', 'security');
                    $dom.show(cvErrorMessageLabel);
                    self.resizeScroll();
                    shake(cvSecurityForm);
                }
            } else {
                getFromPortalInternal('checkPassword', {
                        "profile_id": $soap.createField("string", lStorage.getItem('profile_id')),
                        "login": $soap.createField("string", cvLoginInput.value),
                        "password": $soap.createField("string", cvPasswordInput.value)
                    },
                    function(pData) {
                        //check pass && login
                        if (+$soap.getFieldValue(pData, 'exists'))
                            submitAction(pIndex, pPrlBtn);
                        else {
                            cvErrorMessageLabel.innerHTML = pOwner.loc('checkFailed', 'security');
                            $dom.show(cvErrorMessageLabel);
                            self.resizeScroll();
                            shake(cvSecurityForm);
                        }
                    }
                );
            }
        }
    }

    return self;
}