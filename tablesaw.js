'use strict';
angular.module('responsiveTable')
  .directive('tablesaw', function() {
    return {
      scope: {
        cols: '=',
        data: '=',
        mode: '@'
      },
      transclude: true,
      restrict: 'AE',
      templateUrl: 'tablesaw.html',
      controller: ['$scope', '$window',
        function($scope, $window) {
          var modes = {
            selectCols: "select",
            scrollCols: "scroll"
          };
          if (!$scope.mode) {
            $scope.mode = modes.scrollCols;
          }
          var getVisibility = function(col, width) {
            if ($scope.mode === modes.scrollCols) {
              return true;
            }
            if (col.visibilityOverride) {
              return col.isVisible;
            } //else
            var w = width;
            switch(col.priority) {
              case 1:
                return w >= 320;
              case 2:
                return w >= 480;
              case 3:
                return w >= 640;
              case 4:
                return w >= 800;
              case 5:
                return w >= 960;
              case 6:
                return w >= 1120;
              case "hidden":
                return false;
              default:
                return true;
            }
          };
          // This is a hard reset of all table state
          // Requires cols, transposedData, and width to be known
          var setColumnData = function(overrides) {
            var config = _.assign(overrides || {}, {
              cols: $scope.cols,
              transposedData: $scope.transposedData,
              width: $scope.width
            });
            if (!config.cols 
                || !config.transposedData 
                || !config.width 
                || config.cols.length !== config.transposedData.length) {
              return;
            }
            $scope.colData = _.map(config.cols, function(colData, index) {
              var col = {
                name: colData.name,
                priority: colData.priority,
                sortable: !!colData.sortable,
                visibilityOverride: false,
                data: config.transposedData[index],
                sort: false,
                onClick: colData.onClick
              };
              col.isVisible = getVisibility(col, config.width);
              return col;
            });
          };
          var compileTransposedData = function(data) {
            var newData = data;
            // sort data if applicable
            if ($scope.colData) {
              var colConfig = _.find($scope.colData, function(col) { return !!col.sort;});
              if (colConfig) {
                var i = _.findIndex($scope.cols, { name: colConfig.name });
                newData = data.slice(0);
                var sortFunc = colConfig.sort === 'dsc' ? function(a, b) {return a[i] > b[i];} : function(a, b) {return a[i] < b[i];};
                newData.sort(sortFunc);
              }
            }
            // now retranspose it
            var trans = [];
            _.each(newData, function(row, y){
              _.each(row, function(col, x){
                if (!trans[x]) trans[x] = [];
                trans[x][y] = col;
              });
            });
            // Append a source so a hard reset (setColumnData)
            //  doesn't occur unless source changes.
            trans.source = data;
            $scope.transposedData = trans;
          };
          // When cols changes, hard reset
          $scope.$watch('cols', function(newVal, oldVal) {
            setColumnData({cols: newVal});
          });
          // When data changes, hard reset
          $scope.$watch('data', function(newVal) {
            compileTransposedData(newVal);
          });
          $scope.$watch('transposedData', function(newVal, oldVal) {
            // if colData not yet set or source changes, hard reset
            if (!$scope.colData || (newVal && oldVal && newVal.source !== oldVal.source)) {
              setColumnData({transposedData: newVal});
            } else {
            // when the transposed data changes but source doesn't change (sort)
              _.each($scope.colData, function(colData, index) {
                colData.data = newVal[index];
              });
            }
          });
          $scope.$watch('mode', function(newVal) {
            if ($scope.colData) {
              // when the width changes, update the visibility
              _.each($scope.colData, function(col) {
                col.isVisible = getVisibility(col, $scope.width);
              });
            }
          });
          $scope.$watch('width', function(newVal) {
            // if colData not yet set, hard reset
            if (!$scope.colData) {
              setColumnData({width: newVal});
            } else {
            // when the width changes, update the visibility
              _.each($scope.colData, function(col) {
                col.isVisible = getVisibility(col, newVal);
              });
            }
          });
          // only single column sort (for now)
          $scope.sort = function(colConfig) {
            if (!colConfig) {
              return;
            }
            // set the sort flag
            if (!colConfig.sort) {
              colConfig.sort = "dsc";
            } else {
              colConfig.sort = colConfig.sort === "dsc" ? "asc" : "dsc";
            }
            // reset other sort flags
            _.each($scope.colData, function(col) {
              if (col !== colConfig) {
                col.sort = false;
              }
            });
            compileTransposedData($scope.data);
          };
          // array where length ='s $scope.data.length
          $scope.numRows = function() {
            return _.range(0, $scope.data ? $scope.data.length : 0);
          };
          //set width and update on resize
          angular.element($window).bind('resize', function() {
            $scope.updateWidth();
          });
        }
      ],
      link: function postLink(scope, element, attrs) {
        scope.updateWidth = function() {
          var dims = element[0].getBoundingClientRect();
          scope.width = dims.width;
        };
        scope.updateWidth();
      }
    };
  })
  .directive('mode', function() {
    return {

      restrict: 'A',
      controller: ['$scope', function($scope) {

      }]
    };
  })
  .directive('sortable', function() {
    return {
      restrict: 'A',
      controller: ['$scope', function($scope) {

      }]
    };
  })
  .directive('tablesawBar', function() {
    return {
      restrict: 'E',
      scope: {
        cols: '='
      },
      templateUrl: 'tablesawBar.html',
      controller: ['$scope', function($scope) {
        $scope.activeFlag = false;
        $scope.$watch('cols', function(newVal) {
          $scope.allVisible = _.every(newVal, 'isVisible');
        });
        $scope.$watch('activeFlag', function(newVal) {
          if (!newVal) {
            $scope.isShowingPopup = false;
          }
        });
        $scope.$watch('isShowingPopup', function(newVal) {
          if (newVal) {
            $scope.activeFlag = true;
          }
        });
        $scope.setAllVisible = function(isVisible) {
          $scope.allVisible = isVisible;
          _.each($scope.cols, function(col) {
            if (col.priority !== 'persist') {
              col.isVisible = isVisible;
            }
          });
        };
        $scope.setColumnVisibility = function(col, isVisible) {
          col.isVisible = isVisible;
          col.visibilityOverride = true;
        };
      }]
    };
  })