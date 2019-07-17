
var execute = function () {

    var result = session.createQuery("from turbo.ChangeLog order by dateExecuted desc").list();
    console.log(result);
    this.resolve(result);
}
