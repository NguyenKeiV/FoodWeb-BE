// Sequelize Cart Model Definition
module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    "Cart",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        validate: {
          notEmpty: {
            msg: "User ID không được để trống",
          },
        },
      },
      food_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "foods",
          key: "id",
        },
        validate: {
          notEmpty: {
            msg: "Food ID không được để trống",
          },
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: "Số lượng phải ít nhất là 1",
          },
          isInt: {
            msg: "Số lượng phải là số nguyên",
          },
        },
      },
      price_at_add: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: "Giá tại thời điểm thêm vào giỏ hàng",
        validate: {
          min: {
            args: [0],
            msg: "Giá không được âm",
          },
        },
      },
    },
    {
      tableName: "carts",
      timestamps: true,
      paranoid: true, // Soft delete
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "food_id"],
          name: "unique_user_food",
        },
        {
          fields: ["user_id"],
        },
        {
          fields: ["food_id"],
        },
      ],
    }
  );

  // Associations
  Cart.associate = function (models) {
    // Cart belongs to User
    Cart.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Cart belongs to Food
    Cart.belongsTo(models.Food, {
      foreignKey: "food_id",
      as: "food",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Cart;
};
