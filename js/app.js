/*
 * The code below didn't fully leverage the power of Parse SDK, which is the fork of Backbone.js.
 * While the code emphasises on the usage of Parse SDK on the premise of not confusing readers 
 * who are not familiar with MVC and override in object-oriented programming, the use of router,
 * event listener and handler functions guarantees the basic architecture on a certain level.
 *
 * If you're determined to become an front-end developer of web application, I encourage you to
 * learn how to use frameworks such as Backbone.js or Ember.js. See what goods they're offering
 * you for free, and what the design principle saves you from wrting lousy, messy JavaScript codes.
 * Certianly, you won't feel free for the first time, since it FORCES you to think in its own
 * way. It's kind of like the deal Faust made with the devil, you give up your way of thinking
 * for something good. (such as View object, Data binding) However, once you're used to it, and
 * start to think outside of the box, you broke the deal and gained knowledge, pretty much like 
 * the ending of Goethe's Faust.
 *
 * So, shall we begin?
 *
 * */
var cart = null;

(function(){
  
  Parse.initialize('4sm6oolNwqCWoKLqHQLfAA0oPabqt8CLRVWpcZKg', 
      '1bKw1v2vRiLuF9wtRzMZNiyZFg0GxiEmyNoy4VAo');

  // Precompile each template and collects them all in an object.
  var templates = {};
  ['loginTemplate', 'catalogTemplate', 'catalogPaginationTemplate', 'dress_detialTemplate', 'mycartTemplate'].forEach(function(e){
    var tpl = document.getElementById(e).text;
    templates[e] = doT.template(tpl);
  });

  myCart = {
    setAmountTo: function(user, dress, amount, callback){
      var Order = Parse.Object.extend("Order");
      // Make new created object available only to the creater.
      var orderACL = new Parse.ACL();
      orderACL.setPublicReadAccess(false);
      orderACL.setPublicWriteAccess(false);
      orderACL.setReadAccess(user, true);
      orderACL.setWriteAccess(user, true);
      
      // Ask if the order already exists, if so, update the amount, or create new order object.
      var query = new Parse.Query(Order);
      query.equalTo('user', user);
      query.equalTo('dress', dress);
      // We only need the first item (and the only item) of the query result.
      query.first({
        success: function(order){
          // Set amount to zero indicates that the order is discarded.
          if( amount === 0 && order ){
            order.destroy({
              success: function(order){
                callback();
              }
            });
          } else {
            // the order object is not created, yet. (Notice order.setACL, and relational data.)
            if( order === undefined ){
              order = new Order();
              order.set('user', user);
              order.set('dress', dress);
              order.setACL(orderACL);
            }

            // Update and save the object to server.
            order.set('amount', amount);
            order.save(null, {
              success: function(order){
                callback();
              }
            });
          }
        }, error: function(object, err){
        
        }
      });
    },
  };

  /* Handler Functions */
  var handlers = {
    navbar: function(){
      var currentUser = Parse.User.current();
      if (currentUser){
      // Determine what authenticated user can see......      
        document.getElementById('login_button').style.display = 'none';
        document.getElementById('cart_button').style.display = 'block';
        document.getElementById('logout_button').style.display = 'block';
        document.getElementById('user_id').innerHTML = currentUser.get('username');
      } else {
      // Or anonymous user can see.
        document.getElementById('login_button').style.display = 'block';
        document.getElementById('cart_button').style.display = 'none';
        document.getElementById('logout_button').style.display = 'none';
      }
      document.getElementById('logout_button').addEventListener('click', function(){
        Parse.User.logOut();
        handlers.navbar();
        window.location.hash = '';
      });
    },
    catalog: function(page){
      window.scrollTo(0,0);
      // To support pagination.
      var limit = 16;
      var skip = (page-1) * limit;
      var Dress = Parse.Object.extend("Dress");
      var query = new Parse.Query(Dress);
      query.limit(limit);
      query.skip(skip);
      query.descending("createdAt");
      query.find({
        success: function(results) {
          var objList = results.map(function(e){ return e.toJSON() });
          document.getElementById('content').innerHTML = templates.catalogTemplate(objList);
          query.limit(0);
          query.skip(0);
          var option = {};
          // To support pagination.
          query.count({
              success: function(count){
              var totalPage = Math.ceil(count / limit);
              var currentPage = parseInt(page);
              option = {
                // Watch out the limit.
                'previous': (currentPage === 1) ? 1 : currentPage-1,
                'next': (currentPage === totalPage) ? currentPage : currentPage+1,
                'current': currentPage,
                'last': totalPage,
              };
              document.getElementById('pagination').innerHTML = 
                templates.catalogPaginationTemplate(option);
            }, error: function(err){
      
            }  
          });
        }
      });
    },
    dress_detail: function(dress_id){
      if(dress_id){
        var Dress = Parse.Object.extend("Dress");
        var query = new Parse.Query(Dress);
        query.get(dress_id, {
          success: function(dress){
            document.getElementById('content').innerHTML = 
              templates.dress_detialTemplate(dress.toJSON());
            // Binding for add to the cart function.
            document.getElementById('addToCart').addEventListener('click', function(){
              var currentUser = Parse.User.current();
              if(currentUser){
                var e = document.getElementById('amount');
                var amount = parseInt(e.options[e.selectedIndex].value);
                // Remember we declare myCart.setAmountTo function prior to this object?
                myCart.setAmountTo(currentUser, dress, amount, function(){
                  alert("此商品已加入到您的購物車。");
                });
              } else {
                // If the user isn't logged in, redirect to login page with successful callback to this product.
                window.location.hash = 'login/'+ window.location.hash;
              }
            });
          }, error: function(object, error){
          }
        });
      } else {
        window.location.hash = '';
      }
    },
    mycart: function(){
      var currentUser = Parse.User.current();      
      if (currentUser) {
        var Order = Parse.Object.extend("Order");
        var query = new Parse.Query(Order);
        query.equalTo('user', currentUser);
        // Let the query return results along with relational data.
        query.include('dress');
        query.find({
          success: function(results){
            var objList = results.map(function(e){ 
              return {
                'dressId': e.get('dress').id,
                'amount': e.get('amount'),
                'name': e.get('dress').get('name'),
                'previewUrl': e.get('dress').get('previewUrl'),                
              }
            });
            document.getElementById('content').innerHTML = templates.mycartTemplate(objList);
            results.forEach(function(e){
              var changeAmount = document.getElementById('change_amount_'+e.get('dress').id);
              changeAmount.addEventListener('change', function(){
                var amount = parseInt(this.options[this.selectedIndex].value);
                myCart.setAmountTo(currentUser, e.get('dress'), amount, function(){});
              });
              var cancelOrderBtn = document.getElementById('cancel_order_'+e.get('dress').id);
              cancelOrderBtn.addEventListener('click', function(){
                myCart.setAmountTo(currentUser, e.get('dress'), 0, function(){
                  if (cancelOrderBtn.parentNode.parentNode.childElementCount === 1){
                    handlers.mycart();
                  } else {
                    cancelOrderBtn.parentNode.remove();
                  }
                });
              });
            });
            // Easter Egg!!!
            document.getElementById('payButton').parentNode.addEventListener('click', function(){
              // Toogle Effect
              if( this.childElementCount === 1){
                var YTcode = '<iframe width="960" height="517" ' +
                  'src="https://www.youtube-nocookie.com/embed/NkQc4FXCvtA?autoplay=1&rel=0&iv_load_policy=3"' +
                  ' frameborder="0" allowfullscreen></iframe>';
                this.innerHTML += YTcode;
              } else {
                this.children[1].remove();
              }
              return false
            });
          },
          error: function(error){
          
          },
        });
      } else {
        window.location.hash = 'login/'+ window.location.hash;
      }
    },
    login: function(redirect){
      var currentUser = Parse.User.current();
      // What to do after signin / signup is successfully performed.
      var postAction = function(){
        handlers.navbar();
        window.location.hash = (redirect) ? redirect : '';
      }
      
      if (currentUser) {
        window.location.hash = '';
      } else {
        // Signin Function binding, provided by Parse SDK.        
        document.getElementById('content').innerHTML = templates.loginTemplate();
        document.getElementById('loginForm').addEventListener('submit', function(){
          Parse.User.logIn(document.getElementById('loginForm_username').value,
              document.getElementById('loginForm_password').value, {
            success: function(user) {
              // Do stuff after successful login.
              postAction();
            },
            error: function(user, error) {
              // The login failed. Check error to see why.
            }
          }); 
        });
        // Signup Form Password Match Check Binding.
        document.getElementById('singupForm_password1').addEventListener('keyup', function(){
          var singupForm_password = document.getElementById('singupForm_password');
          var message = (this.value !== singupForm_password.value) ? '密碼不一致，請再確認一次。' : '';
          document.getElementById('signupForm_message').innerHTML = message;           
        });
        // Signup Function binding, provided by Parse SDK.
        document.getElementById('singupForm').addEventListener('submit', function(){
          var singupForm_password = document.getElementById('singupForm_password');
          var singupForm_password1 = document.getElementById('singupForm_password1');
          if(singupForm_password.value !== singupForm_password1.value){
            document.getElementById('signupForm_message').innerHTML = '密碼不一致，請再確認一次。';
            return false;
          }

          var user = new Parse.User();
          user.set("username", document.getElementById('singupForm_username').value);
          user.set("password", document.getElementById('singupForm_password').value);
          user.set("email", document.getElementById('singupForm_emailAddress').value);
 
          user.signUp(null, {
            success: function(user) {
              postAction();
              // Hooray! Let them use the app now.
            },
            error: function(user, error) {
              // Show the error message somewhere and let the user try again.
              document.getElementById('signupForm_message').innerHTML = error.message + '['+error.code+']';
            }
          });
        }, false);
      } 
    }
  }

  /* Router */
  var App = Parse.Router.extend({
    routes: {
      '': 'index',
      'page/:page/': 'catalog',
      'dress/:dress_id/': 'dress_detail',
      'mycart/': 'mycart',
      'login/*redirect': 'login',
    },
    // If frontpage is requested, show the first page of catalog.
    index: function(){
      return handlers.catalog(1);
    },
    catalog: handlers.catalog,
    dress_detail: handlers.dress_detail,
    mycart: handlers.mycart,
    login: handlers.login,
  });

  // Initialize the App
  this.Router = new App();
  Parse.history.start();
  handlers.navbar();

})();
