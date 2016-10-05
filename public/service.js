/**
 * Created by shaopengli on 16/7/4.
 */
var webapp = angular.module('reservationApp', ['ngRoute', 'ngAnimate', 'ui.bootstrap']);

webapp.controller('UserController', ['$scope', 'UserService', function ($scope, UserService) {
    var self = this;
    self.userService = UserService;
    UserService.session();
}]);

webapp.controller('LoginController', ['$location', 'UserService', '$uibModal', function ($location, UserService, $uibModal) {
    var self = this;//todo
    self.user = {};

    self.islog = UserService.isLoggedIn;

    self.login = function () {
        UserService.login(this.user).then(function (res) {
            $location.path('/owner');
            console.log("successful login to owner's account");
        }, function (err) {
            (self.open = function () {
                $uibModal.open({
                    animation: true,
                    templateUrl: '/tpls/loginErrorReminder.html',
                    controller: 'ModalInstanceCtrl as templateCtrl',
                    resolve: {
                        items: function () {
                            return err.data.msg;
                        }
                    }
                });
            })();
        })
    };
    
}]);

webapp.controller('DetailsController', ['$scope', '$routeParams', 'ResService', '$location',
    function ($scope, $routeParams, ResService, $location) {
        var self = this;
        self.reservation = {};

        ResService.getReserve($routeParams.code).then(function (res) {
            self.reservation = ResService.Reserve[0];
            console.log(self.reservation);
        }, function (err) {
            $location.path('/login');
        });

        //  Date input
        ($scope.today = function() {
            $scope.dt = new Date();
        })();

        $scope.clear = function() {
            $scope.dt = null;
        };

        var today = new Date();

        $scope.dateOptions = {
            //dateDisabled: disabled,
            maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()+15),
            minDate: today,
            startingDay: 1
        };

        $scope.open2 = function() {
            $scope.popup2.opened = true;
        };

        $scope.popup2 = {
            opened: false
        };

        // end
    }]);

webapp.controller('MakeReservationController', ['$scope','ResService', 'ownerService', '$uibModal',function ($scope, ResService, ownerService, $uibModal) {
    var self = this;

    (self.getSetting = function () {
      ownerService.getSettings().then(function (res) {
          var temp = res.data;
          self.auto = temp[0].autoAssign;
      })
    })();


    //  Date input
    ($scope.today = function() {
        $scope.dt = new Date();
    })();

    $scope.clear = function() {
        $scope.dt = null;
    };

    var today = new Date();

    $scope.dateOptions = {
        //dateDisabled: disabled,
        maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()+15),
        minDate: today,
        startingDay: 1
    };

    // Disable weekend selection
/*    function disabled(data) {
        var date = data.date,
            mode = data.mode;
        return (mode === 'day') && (date.getDay() === 0 || date.getDay() === 6);
    }*/

    $scope.open2 = function() {
        $scope.popup2.opened = true;
    };

    $scope.popup2 = {
        opened: false
    };

    // end
    
    self.reservation = {
        date: $scope.dt,
        time: "",
        name: "",
        phone: "",
        email: "",
        size: "",
        special: "",
        status: "pending",
        table: ""
    };
    
    self.make = function () {
        ResService.makeReserve(self.reservation).then(function (res) {
            self.result = res.data.id;

            (self.open = function () {
                $uibModal.open({
                    animation: true,
                    templateUrl: '/tpls/remindCode.html',
                    controller: 'ModalInstanceCtrl as templateCtrl',
                    resolve: {
                        items: function () {
                            return self.result;
                        }
                    }
                });
            })();
        }, function (err) {
                console.error('unable to make reserve');
        });
        
        //this part for auto assign
        if(self.auto){
            ownerService.getTableList().then(function (res) {
                self.tableList = res.data;
                
                for(var i = 0; i < (self.tableList).length; i++){
                    if(self.tableList[i].status == "Available"){
                        var table = self.tableList[i];

                        table.status = "Occupied";
                        table.since = self.reservation.time;
                        table.CNF = self.result;
                        table.name = self.reservation.name;
                        table.style = {"background-color":"#CF5025", "color":"black"};

                        ResService.changeState(self.result, i+1);
                        ownerService.takeTable(table).then(function (res) {
                            console.log('auto assign table successful');
                        },
                        function (err) {
                           console.error('can not auto assign table');
                        });
                        
                        break;
                    }
                }
            },
            function (err) {
                console.error('could not get tableList in makeReservation')
            });


        }
    };
}]);

webapp.controller('ModalInstanceCtrl', function ($uibModalInstance, items) {
    this.items = items;
    this.ok = function () {
        $uibModalInstance.close();
    };
});

webapp.controller('findReservationController', ['$location', 'ResService', '$uibModal', function ($location ,ResService, $uibModal) {
    var self = this;
    
    
    self.find = function () {
        ResService.getReserve(self.id).then(function (res) {
            $location.path('/changeRes');

        }, function (err) {
            (self.open = function () {
                $uibModal.open({
                    animation: true,
                    templateUrl: '/tpls/checkRes.html',
                    controller: 'checkReservationController as checkCtrl',
                    resolve: {
                        items: function () {
                            return "";
                        }
                    }
                });
            })();
        })
    }
}]);

webapp.controller('checkReservationController', function ($uibModalInstance, items) {
    this.ok = function () {
        $uibModalInstance.close();
    };
});

webapp.controller('changeReservationController', ['$scope', '$location', 'ResService', 'ownerService', function ($scope, $location, ResService, ownerService) {
    var self = this;
    
    self.reservation = ResService.Reserve;
    self.cancel = "";
    
    self.changeReserve = function () {
        if(self.cancel){
            var code = self.reservation[0]._id;
            var table = self.reservation[0].table;

            if(table != null) {
                ownerService.cancelTable(table);
            }
            ResService.cancelReserve(code).then(function (res) {
                console.log("cancel successful");
            },
            function (err) {
                console.error('unable to cancel');
            })
        } else {
            ResService.changeReserve(self.reservation).then(function (res) {
                    console.log("change success");
                },
                function (err) {
                    console.error('unable to make change');
                })
        }

        $location.path('/');
    };

    //  Date input
    ($scope.today = function() {
        $scope.dt = new Date();
    })();

    $scope.clear = function() {
        $scope.dt = null;
    };

    var today = new Date();

    $scope.dateOptions = {
        //dateDisabled: disabled,
        maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()+15),
        minDate: today,
        startingDay: 1
    };

    // Disable weekend selection
    /*    function disabled(data) {
     var date = data.date,
     mode = data.mode;
     return (mode === 'day') && (date.getDay() === 0 || date.getDay() === 6);
     }*/

    $scope.open2 = function() {
        $scope.popup2.opened = true;
    };

    $scope.popup2 = {
        opened: false
    };

    // end
    
}]);

webapp.controller('showReservationCtrl', ['ResService', function (ResService) {
    var self = this;
    
    self.list = [];
    
    (self.loadList = function () {
        ResService.getAll().then(function (res) {
            self.list = res;
        })
    })();
}]);

webapp.controller('changeProfileController', ['$location','ownerService',  function ($location, ownerService) {
    var self = this;
    
    (self.getProfile = function () {
        ownerService.getProfile().then(function (res) {
            self.profile = ownerService.profile[0];
        })
    })();
    

    self.changeProfile = function () {
        ownerService.renewProfile(self.profile).then(function (res) {
            console.log(res);
            location.path('/ownerPage');
        },
        function (err) {
            console.error('unable to change profile client side');
        })
    }

    
}]);

webapp.controller('contactListController', ['ownerService', function (ownerService) {
    var self = this;
    
    self.list = "";
    
    (self.getContact = function () {
        ownerService.getContact().then(function (res) {
            self.list = res;
        })
    })();
}]);

webapp.controller('getTableController', ['$routeParams', 'ownerService', 'ResService', function ($routeParams, ownerService, ResService) {
    var self = this;
    self.newStyle = [];

    (self.init = function () {
        //get user profile
        ResService.getReserve($routeParams.code).then(function (res) {
            self.user = res[0];
        },
        function (err) {
            console.error('can not get userInfo client side');
        });
        //get table list
        ownerService.getTableList().then(function (res) {
            var beforeSort = res;
            //sort table list
            beforeSort.sort(function (a,b) {
               return parseInt(a._id - b._id);
            });
            self.tableList = beforeSort;
        },
        function (err) {
            console.error('can not get table list client side');
        });
    })();

    self.takeTable = function (code) {
        var r = confirm("Are you sure you want sign " + self.user.name + " to this table");

        // owner chose to assign table to client
        if(r){
            var record = self.tableList[code - 1];
            record.status = "Occupied";
            record.since = self.user.time;
            record.CNF = self.user._id;
            record.name = self.user.name;
            record.style = {"background-color":"#CF5025", "color":"black"};
            
            //change user state
            ResService.changeState(self.user._id, code);

            ownerService.takeTable(record).then(function (res) {
                console.log('success');
            },
            function (err) {
                console.error('unable to assign table client side');
            });
        }  //end if
    };
    
}]);

webapp.controller('seatingController', ['ownerService', 'ResService', function (ownerService, ResService) {
    var self = this;

    (self.init = function () {
        ownerService.getTableList().then(function (res) {
                var beforeSort = res;
                beforeSort.sort(function (a,b) {
                    return parseInt(a._id - b._id);
                });
                self.tableList = beforeSort;
            },
            function (err) {
                console.error('can not get table list client side');
            });
    })();

    self.deleteTable = function (index) {
        var r = confirm("Are you sure want to delete assignment from this table?");

        if(r){
            var table = self.tableList[index];
            console.log(table.CNF);
            if(table.status == "Available"){
                alert("can not delete assignment from table taken by nobody!");
            } else {
                //table
                ResService.changeState(table.CNF, "");

                table.status = "Available";
                table.since = "";
                table.CNF = "";
                table.name = "";
                table.style = "";
                
                ownerService.cancelTable(table._id).then(function (res) {
                    
                    console.log('successful delete assignment from table '+ (index+1));
                },
                function (err) {
                    console.error('can not successful delete assignment from table ' + (index+1));
                });
            }
        }

    }
}]);


webapp.controller('detailController', ['$routeParams', '$location', 'ResService', 'ownerService' ,function ($routeParams, $location, ResService, ownerService) {
    var self = this;

    (self.init = function () {
        ResService.getReserve($routeParams.code).then(function (res) {
            self.reservation = ResService.Reserve;
        },
        function (err) {
            console.error('detail controller can not get data');
        });
    })();
    
    self.changeReserve = function () {
        if(self.cancel){
            var code = self.reservation[0]._id;
            var table = self.reservation[0].table;

            if(table != ""){
                ownerService.cancelTable(table);
            }
            
            ResService.cancelReserve(code).then(function (res) {
                    console.log("cancel successful");
                },
                function (err) {
                    console.error('unable to cancel');
                })
        } else {
            ResService.changeReserve(self.reservation).then(function (res) {
                    console.log("change success");
                },
                function (err) {
                    console.error('unable to make change');
                })
        }
        $location.path('/reservations');
    };
    
}]);

webapp.controller('AppSettingController', ['$scope', '$location','ownerService', function ($scope, $location, ownerService) {
    var self = this;
    
    (self.init = function () {
        ownerService.getSettings().then(function (res) {
            self.setting = res.data[0];
        },
        function (err) {
            console.error('can not get settings in app setting controller');
        });
    })();
    
    self.changeSettings = function () {
        ownerService.changeSettings(self.setting).then(function (res) {
                console.log('successful change settings');
            },
            function (err) {
                console.error('can not change settings');
            });
        $location.path('/reservations');
    };
}]);



/*
* factory define below
* */
webapp.factory('UserService', ['$http', function ($http) {
    var service = {
        isLoggedIn: false,
        session: function () {
            return $http.get('/api/session').then(function (res) {
                service.isLoggedIn = true;
                if(res == "" || res == null){
                    console.log("nothing get form res");
                }
                else {console.log(res);}
                return res;
            });
        },
        login: function (user) {
            return $http.post('/api/login', user).then(function (res) {
                service.isLoggedIn = true;
                return res;
            });
        },
        logout: function () {
            return $http.get('/api/logout').then(function (res) {
                return res;
            });
        }
    };
    return service;
}]);

webapp.factory('ResService', ['$http', function ($http) {
    var service = {
        Reserve: "",
        id: "",

        makeReserve: function (reservation) {
            return $http.post('/api/makeReserve', reservation).then(function (res) {
                service.id = res.data.id;
                return res;
            });
        },
        getReserve: function (code) {
            var send = {id: code};
            return $http.post('/api/getReserve', send).then(function (res) {
                var temp = res.data;
                temp[0].date = new Date(temp[0].date);
                temp[0].time = new Date(temp[0].time);

                service.Reserve = temp;
                console.log(service.Reserve);
                return service.Reserve;
            });
        },
        changeReserve: function (reservation) {
            return $http.post('/api/changeReserve', reservation).then(function (res) {
                return res;
            });
        },
        cancelReserve: function (code) {
            var send = {id: code};
            
            return $http.post('/api/cancelReserve', send).then(function (res) {
                return res;
            });
        },
        getAll: function () {
            return $http.get('/api/getAllReserve').then(function (res) {
                var temp = res.data;
                for(var i = 0; i < temp.length; i++) {
                    temp[i].date = new Date(temp[i].date);
                    temp[i].time = new Date(temp[i].time);
                }
                return temp;
            });
        },
        changeState: function (code, number) {
            var send = {id:code, table:number};
            return $http.post('/api/changeState', send).then(function (res) {
                return res;
            });
        }
        
        
    };
    
    return service;
}]);


webapp.factory("ownerService", ['$http', function ($http) {
    var ownerService = {
        profile: "",
        tableList: "",

        renewProfile: function (profile) {
            return $http.post('/api/owner/renewProfile', profile).then(function(res) {
                return res;
            });
        },
        getProfile: function() {
            return $http.get('/api/owner/getProfile').then(function (res) {
                ownerService.profile = res.data;
                return res;
            });
        },
        addContact: function (record) {
            return $http.post('/api/owner/addContact', record).then(function (res) {
                return res;
            });
        },
        getContact: function () {
            return $http.get('/api/owner/getContact').then(function (res) {
                var temp = res.data;
                for(var i = 0; i < temp.length; i++) {
                    temp[i].date = new Date(temp[i].date);
                    temp[i].time = new Date(temp[i].time);
                }
                return temp;
            });
        },
        getTableList: function () {
            return $http.get('/api/owner/getTableList').then(function (res) {
                var temp = res.data;
                for(var i = 0; i < temp.length; i++) {
                    temp[i].since = new Date(temp[i].since);
                }
                return temp;
            });
        },
        takeTable: function (record) {
            return $http.post('/api/owner/takeTable', record).then(function (res) {
                return res;
            });
        },
        cancelTable: function (table) {
            var send = {id:table};
            return $http.post('/api/owner/cancelTable', send).then(function (res) {
                return res;
            });
        },
        getSettings: function () {
            return $http.get('/api/owner/getSetting').then(function (res) {
                return res;
            });
        },
        changeSettings: function (set) {
            return $http.post('/api/owner/changeSetting', set).then(function (res) {
                return res;
            });
        }


    };
    
    return ownerService;
}]);





webapp.config(function ($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'tpls/login.html',
        controller: 'MakeReservationController as resCtrl'
    }).when('/owner', {
        templateUrl: 'tpls/owner.html',
        controller: 'showReservationCtrl as showCtrl'
    }).when('/teams/:code', {
        templateUrl: 'tpls/details.html',
        controller: 'DetailsController as detailCtrl'
    }).when('/guestPage', {
        templateUrl: 'tpls/login.html',
        controller: 'MakeReservationController as resCtrl'
    }).when('/login', {
        templateUrl: 'tpls/login.html',
        controller: 'LoginController as loginCtrl'
    }).when('/reservations', {
        templateUrl: 'tpls/owner.html',
        controller: 'showReservationCtrl as showCtrl'
    }).when('/seatting', {
        templateUrl: 'tpls/owner.html',
        controller: 'seatingController as seatCtrl'
    }).when('/profile', {
        templateUrl: 'tpls/owner.html',
        controller: 'changeProfileController as profileCtrl'
    }).when('/setting', {
        templateUrl: 'tpls/owner.html',
        controller: 'AppSettingController as settingCtrl'
    }).when('/contact', {
        templateUrl: 'tpls/owner.html',
        controller:  'contactListController as contactCtrl'
    }).when('/detail/:code', {
        templateUrl: 'tpls/details.html',
        controller: 'detailController as detailCtrl'
    }).when('/find', {
        templateUrl: 'tpls/findReservation.html',
        controller: 'findReservationController as findCtrl'
    }).when('/changeRes', {
        templateUrl: 'tpls/changeReservation.html',
        controller: 'changeReservationController as changeCtrl'
    }).when('/getTable/:code', {
        templateUrl: 'tpls/setTable.html',
        controller: 'getTableController as tableCtrl'
    }).when('/deleteRes/:code', {
        templateUrl: 'tpls/owner.html',
        controller: 'cancelResController'
    })
});